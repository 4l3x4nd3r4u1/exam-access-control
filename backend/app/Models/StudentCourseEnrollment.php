<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentCourseEnrollment extends Model
{
    use HasFactory;

    protected $table = 'inscripcion';
    public $incrementing = false;
    protected $primaryKey = ['usuario_id', 'materia_grupo_id'];

    protected $fillable = [
        'usuario_id',
        'materia_grupo_id',
        'estado_inscripcion_id',
        'motivo_inhabilitacion',
        'fecha_inscripcion',
        'student_key',
        'course_group_id',
        'status',
        'ineligibility_reason',
    ];

    public ?string $tempStudentKey = null;
    public ?string $tempCourseGroupId = null;
    public ?string $tempStatus = null;

    protected function casts(): array
    {
        return [
            'fecha_inscripcion' => 'datetime',
        ];
    }

    public function setStudentKeyAttribute($value): void
    {
        $this->tempStudentKey = (string) $value;
    }

    public function setCourseGroupIdAttribute($value): void
    {
        $this->tempCourseGroupId = (string) $value;
    }

    public function setStatusAttribute($value): void
    {
        $this->tempStatus = (string) $value;
    }

    public function setIneligibilityReasonAttribute($value): void
    {
        $this->attributes['motivo_inhabilitacion'] = $value;
    }

    protected static function booted(): void
    {
        static::creating(function (StudentCourseEnrollment $enrollment) {
            if (empty($enrollment->usuario_id) && !empty($enrollment->tempStudentKey)) {
                $student = Student::where('codigo_sis', (int) $enrollment->tempStudentKey)->first();
                if ($student) {
                    $enrollment->usuario_id = $student->usuario_id;
                }
            }

            if (empty($enrollment->materia_grupo_id) && !empty($enrollment->tempCourseGroupId)) {
                if (is_numeric($enrollment->tempCourseGroupId)) {
                    $enrollment->materia_grupo_id = (int) $enrollment->tempCourseGroupId;
                } elseif (preg_match('/^([A-Z0-9]+)-G?([A-Z0-9]+)-(.*)$/i', $enrollment->tempCourseGroupId, $m)) {
                    $cg = CourseGroup::whereHas('course', fn($q) => $q->where('sigla', strtoupper($m[1])))
                        ->where('grupo', strtoupper($m[2]))
                        ->where('gestion', $m[3])
                        ->first();
                    if ($cg) {
                        $enrollment->materia_grupo_id = $cg->id;
                    }
                }
            }

            if (empty($enrollment->estado_inscripcion_id)) {
                $statusName = $enrollment->tempStatus ?: 'HABILITADO';
                $status = EnrollmentStatus::firstOrCreate(
                    ['nombre' => $statusName],
                    ['descripcion' => $statusName]
                );
                $enrollment->estado_inscripcion_id = $status->id;
            }

            if (empty($enrollment->fecha_inscripcion)) {
                $enrollment->fecha_inscripcion = now();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'usuario_id', 'usuario_id');
    }

    public function courseGroup(): BelongsTo
    {
        return $this->belongsTo(CourseGroup::class, 'materia_grupo_id');
    }

    public function enrollmentStatus(): BelongsTo
    {
        return $this->belongsTo(EnrollmentStatus::class, 'estado_inscripcion_id');
    }

    // Accessors for backward compatibility
    public function getStatusAttribute(): string
    {
        return $this->enrollmentStatus?->nombre ?? '';
    }

    public function getIneligibilityReasonAttribute(): ?string
    {
        return $this->motivo_inhabilitacion;
    }

    public function getStudentKeyAttribute(): string
    {
        return (string) ($this->student?->codigo_sis ?? '');
    }

    public function getCourseGroupIdAttribute(): string
    {
        return (string) $this->materia_grupo_id;
    }
}
