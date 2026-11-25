<?php

namespace Tests\Feature;

use App\Models\CourseGroup;
use App\Models\EmailDomain;
use App\Models\Student;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class DetailedExamReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function authHeadersFor(User $user): array
    {
        $token = JWTAuth::fromUser($user);

        return [
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
        ];
    }

    private function createExamFixture(bool $finished = true, ?User $teacher = null): array
    {
        $teacher ??= User::where('email', 'ana.morales@umss.edu.bo')->firstOrFail();
        $course = DB::table('materia')->where('sigla', 'INF110')->first();
        $examTypeId = DB::table('tipo_examen')->value('id');

        $courseGroup = CourseGroup::firstOrCreate(
            [
                'materia_id' => $course->id,
                'grupo' => '2',
                'gestion' => '2-2026',
            ],
            [
                'docente_id' => $teacher->id,
                'activo' => true,
            ]
        );

        $roomId = DB::table('aula')->where('nombre', 'Auditorio 1')->value('id');
        if (!$roomId) {
            $roomId = DB::table('aula')->insertGetId([
                'nombre' => 'Auditorio 1',
                'capacidad' => 120,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $now = CarbonImmutable::now('America/La_Paz');
        $examDate = $finished ? $now->subDays(2)->format('Y-m-d') : $now->addDays(3)->format('Y-m-d');

        $examId = DB::table('examen')->insertGetId([
            'materia_grupo_id' => $courseGroup->id,
            'tipo_examen_id' => $examTypeId,
            'fecha' => $examDate,
            'hora_inicio' => '10:00:00',
            'hora_fin' => '12:00:00',
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('examen_aula')->insert([
            'examen_id' => $examId,
            'aula_id' => $roomId,
            'cupo_asignado' => 60,
            'auxiliar_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$examId, $courseGroup, $roomId, $teacher];
    }

    private function createStudent(string $name, int $sis, string $ci): User
    {
        $emailId = EmailDomain::where('dominio', '@est.umss.edu')->value('id');
        $user = User::create([
            'nombre' => $name,
            'email' => "s{$sis}@est.umss.edu",
            'email_id' => $emailId,
            'contrasena' => bcrypt('password123'),
            'ci' => $ci,
            'activo' => true,
        ]);

        Student::create([
            'codigo_sis' => $sis,
            'usuario_id' => $user->id,
        ]);

        return $user;
    }

    public function test_detailed_report_endpoints_require_authentication()
    {
        $this->getJson('/api/detailed-exam-reports/finished-exams')->assertStatus(401);
        $this->getJson('/api/detailed-exam-reports/1')->assertStatus(401);
        $this->postJson('/api/detailed-exam-reports/1/generate')->assertStatus(401);
        $this->getJson('/api/detailed-exam-reports/1/1/pdf')->assertStatus(401);
    }

    public function test_finished_exams_lists_only_finished_exams_with_filters_and_role_scoping()
    {
        $ana = User::where('email', 'ana.morales@umss.edu.bo')->firstOrFail();
        $carlos = User::where('email', 'carlos.mendoza@umss.edu.bo')->firstOrFail();
        $superadmin = User::where('email', 'superadmin@umss.edu.bo')->firstOrFail();

        [$finishedId] = $this->createExamFixture(true, $ana);
        [$futureId] = $this->createExamFixture(false, $ana);

        // Ana sees only her finished exam (never the future one)
        $this->withHeaders($this->authHeadersFor($ana))
            ->getJson('/api/detailed-exam-reports/finished-exams')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.exam_id', (string) $finishedId)
            ->assertJsonPath('data.0.status', 'FINALIZADO');

        // Carlos does not manage Ana's exam
        $this->withHeaders($this->authHeadersFor($carlos))
            ->getJson('/api/detailed-exam-reports/finished-exams')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Admin / Superadmin sees all finished exams
        $this->withHeaders($this->authHeadersFor($superadmin))
            ->getJson('/api/detailed-exam-reports/finished-exams?gestion=2-2026')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['exam_id' => (string) $futureId]);
    }

    public function test_show_rejects_unfinished_exam_and_unauthorized_teacher()
    {
        $ana = User::where('email', 'ana.morales@umss.edu.bo')->firstOrFail();
        $carlos = User::where('email', 'carlos.mendoza@umss.edu.bo')->firstOrFail();

        [$finishedId] = $this->createExamFixture(true, $ana);
        [$futureId] = $this->createExamFixture(false, $ana);

        $this->withHeaders($this->authHeadersFor($ana))
            ->getJson("/api/detailed-exam-reports/{$futureId}")
            ->assertStatus(422);

        $this->withHeaders($this->authHeadersFor($carlos))
            ->getJson("/api/detailed-exam-reports/{$finishedId}")
            ->assertStatus(403);
    }

    public function test_show_aggregates_all_recorded_exam_events_generate_persists_and_pdf_downloads()
    {
        $ana = User::where('email', 'ana.morales@umss.edu.bo')->firstOrFail();
        [$examId, , $roomId] = $this->createExamFixture(true, $ana);

        $presentStatusId = DB::table('estado_examen_estudiante')->where('nombre', 'PRESENTE')->value('id');
        $excStatusId = DB::table('estado_examen_estudiante')->where('nombre', 'INGRESO EXCEPCIONAL')->value('id');
        $expStatusId = DB::table('estado_examen_estudiante')->where('nombre', 'EXPULSADO')->value('id');
        $absentStatusId = DB::table('estado_examen_estudiante')->where('nombre', 'AUSENTE')->value('id');

        $s1 = $this->createStudent('Estudiante Presente', 202610001, '9100001');
        $s2 = $this->createStudent('Estudiante Excepcional', 202610002, '9100002');
        $s3 = $this->createStudent('Estudiante Expulsado', 202610003, '9100003');
        $s4 = $this->createStudent('Estudiante Ausente', 202610004, '9100004');

        DB::table('examen_estudiante')->insert([
            [
                'examen_id' => $examId, 'usuario_id' => $s1->id, 'aula_id' => $roomId,
                'estado_id' => $presentStatusId, 'hora_ingreso' => '2026-11-22 10:05:00',
                'observaciones' => 'Documento provisional visado', 'motivo_expulsion' => null,
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'examen_id' => $examId, 'usuario_id' => $s2->id, 'aula_id' => $roomId,
                'estado_id' => $excStatusId, 'hora_ingreso' => '2026-11-22 10:12:00',
                'observaciones' => 'Autorizado por docente', 'motivo_expulsion' => null,
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'examen_id' => $examId, 'usuario_id' => $s3->id, 'aula_id' => $roomId,
                'estado_id' => $expStatusId, 'hora_ingreso' => '2026-11-22 10:02:00',
                'observaciones' => null, 'motivo_expulsion' => 'Uso de telefono movil',
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'examen_id' => $examId, 'usuario_id' => $s4->id, 'aula_id' => $roomId,
                'estado_id' => $absentStatusId, 'hora_ingreso' => null,
                'observaciones' => null, 'motivo_expulsion' => null,
                'created_at' => now(), 'updated_at' => now(),
            ],
        ]);

        DB::table('registro_acceso_examen')->insert([
            [
                'exam_id' => $examId, 'aula_id' => $roomId, 'user_id_estudiante' => $s1->id,
                'user_id_operador' => $ana->id, 'fecha' => '2026-11-22', 'hora' => '10:05:00',
                'resultado' => 'PERMITIDO', 'observacion' => null,
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'exam_id' => $examId, 'aula_id' => $roomId, 'user_id_estudiante' => $s2->id,
                'user_id_operador' => $ana->id, 'fecha' => '2026-11-22', 'hora' => '10:12:00',
                'resultado' => 'EXCEPCION', 'observacion' => 'Autorizado por docente',
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'exam_id' => $examId, 'aula_id' => $roomId, 'user_id_estudiante' => $s3->id,
                'user_id_operador' => $ana->id, 'fecha' => '2026-11-22', 'hora' => '10:35:00',
                'resultado' => 'EXPULSION', 'observacion' => 'Uso de telefono movil',
                'created_at' => now(), 'updated_at' => now(),
            ],
        ]);

        DB::table('registro_auditoria')->insert([
            [
                'usuario_id' => $ana->id,
                'accion' => 'REGISTRAR_INFORMACION_RELATIVA',
                'entidad_tipo' => 'examen_estudiante',
                'entidad_id' => $s1->id,
                'detalles' => json_encode([
                    'estudiante_id' => $s1->id,
                    'nombre_estudiante' => $s1->nombre,
                    'codigo_sis' => 202610001,
                    'examen_id' => $examId,
                    'aula' => 'Auditorio 1',
                    'responsable' => $ana->nombre,
                    'descripcion' => 'Documento provisional visado',
                    'fecha_hora' => '2026-11-22 10:40:00',
                ]),
                'fecha' => '2026-11-22 10:40:00',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'usuario_id' => $ana->id,
                'accion' => 'GENERAR_REPORTE_EXAMEN',
                'entidad_tipo' => 'examen',
                'entidad_id' => $examId,
                'detalles' => json_encode(['descripcion' => 'Corte electrico breve de 4 minutos']),
                'fecha' => '2026-11-22 11:15:00',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $detailResponse = $this->withHeaders($this->authHeadersFor($ana))
            ->getJson("/api/detailed-exam-reports/{$examId}")
            ->assertOk()
            ->assertJsonPath('data.summary.total_assigned', 4)
            ->assertJsonPath('data.summary.total_entered', 3)
            ->assertJsonPath('data.summary.total_absent', 1)
            ->assertJsonPath('data.summary.total_observations', 2)
            ->assertJsonPath('data.summary.total_expulsions', 1)
            ->assertJsonPath('data.summary.total_incidents', 1)
            ->assertJsonCount(5, 'data.events')
            ->assertJsonCount(4, 'data.roster');

        $detailResponse->assertJsonFragment(['detail' => 'Uso de telefono movil']);
        $detailResponse->assertJsonFragment(['detail' => 'Corte electrico breve de 4 minutos']);

        $generateResponse = $this->withHeaders($this->authHeadersFor($ana))
            ->postJson("/api/detailed-exam-reports/{$examId}/generate")
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.generated_reports');

        $reportId = (int) $generateResponse->json('data.report.id');
        $this->assertGreaterThan(0, $reportId);

        $pdfResponse = $this->withHeaders($this->authHeadersFor($ana))
            ->get("/api/detailed-exam-reports/{$examId}/{$reportId}/pdf")
            ->assertOk();

        $this->assertStringContainsString(
            'application/pdf',
            (string) $pdfResponse->headers->get('content-type')
        );
        $this->assertStringStartsWith('%PDF-', (string) $pdfResponse->getContent());
    }
}
