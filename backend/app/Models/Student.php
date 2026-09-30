<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $table = 'estudiante';
    protected $primaryKey = 'codigo_sis';
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'codigo_sis',
        'usuario_id',
        'student_key',
        'ci',
        'full_name',
    ];

    public ?string $tempCi = null;
    public ?string $tempFullName = null;

    public function setStudentKeyAttribute($value): void
    {
        $this->attributes['codigo_sis'] = (int) $value;
    }

    public function setCiAttribute($value): void
    {
        $this->tempCi = (string) $value;
        if ($this->user) {
            $this->user->ci = (string) $value;
            $this->user->save();
        }
    }

    public function setFullNameAttribute($value): void
    {
        $this->tempFullName = (string) $value;
        if ($this->user) {
            $this->user->nombre = (string) $value;
            $this->user->save();
        }
    }

    protected static function booted(): void
    {
        static::creating(function (Student $student) {
            if (empty($student->usuario_id)) {
                $sis = $student->codigo_sis;
                $emailDomain = EmailDomain::where('dominio', '@est.umss.edu.bo')->first()
                    ?? EmailDomain::firstOrCreate(
                        ['dominio' => '@est.umss.edu.bo'],
                        ['descripcion' => 'Estudiantes UMSS', 'activo' => true]
                    );

                $user = User::create([
                    'nombre' => $student->tempFullName ?? ('Estudiante ' . $sis),
                    'email' => "{$sis}@est.umss.edu.bo",
                    'email_id' => $emailDomain->id,
                    'contrasena' => bcrypt('password123'),
                    'ci' => $student->tempCi,
                    'activo' => true,
                ]);

                $rol = Role::where('nombre', 'ESTUDIANTE')->first();
                if ($rol) {
                    $user->roles()->attach($rol->id, ['activo' => true, 'fecha_asignacion' => now()]);
                }

                $student->usuario_id = $user->id;
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentCourseEnrollment::class, 'usuario_id', 'usuario_id');
    }

    public function courseGroups(): BelongsToMany
    {
        return $this->belongsToMany(
            CourseGroup::class,
            'inscripcion',
            'usuario_id',
            'materia_grupo_id',
            'usuario_id',
            'id'
        )->withPivot('estado_inscripcion_id', 'motivo_inhabilitacion')->withTimestamps();
    }

    // Accessors for backward compatibility
    public function getStudentKeyAttribute(): string
    {
        return (string) $this->codigo_sis;
    }

    public function getCiAttribute(): string
    {
        return $this->user?->ci ?? '';
    }

    public function getFullNameAttribute(): string
    {
        return $this->user?->nombre ?? '';
    }
}
