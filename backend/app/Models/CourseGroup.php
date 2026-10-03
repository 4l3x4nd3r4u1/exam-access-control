<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseGroup extends Model
{
    use HasFactory;

    protected $table = 'materia_grupo';

    protected $fillable = [
        'materia_id',
        'grupo',
        'gestion',
        'docente_id',
        'activo',
        'subject_code',
        'subject_name',
        'group_code',
        'academic_term',
        'teacher_id',
        'course_group_id',
    ];

    public ?string $tempSubjectCode = null;
    public ?string $tempSubjectName = null;

    protected static function booted(): void
    {
        static::saving(function (CourseGroup $cg) {
            if (empty($cg->materia_id) && !empty($cg->tempSubjectCode)) {
                $course = Course::firstOrCreate(
                    ['sigla' => strtoupper(trim($cg->tempSubjectCode))],
                    ['nombre' => $cg->tempSubjectName ?? $cg->tempSubjectCode, 'activo' => true]
                );
                if (!empty($cg->tempSubjectName) && $course->nombre !== $cg->tempSubjectName) {
                    $course->nombre = $cg->tempSubjectName;
                    $course->save();
                }
                $cg->materia_id = $course->id;
            }

            if (empty($cg->docente_id)) {
                $docente = User::whereHas('roles', fn($q) => $q->where('rol.nombre', 'DOCENTE'))->first()
                    ?? User::first();
                if ($docente) {
                    $cg->docente_id = $docente->id;
                }
            }
        });
    }

    public function setSubjectCodeAttribute($value): void
    {
        $this->tempSubjectCode = $value;
    }

    public function setSubjectNameAttribute($value): void
    {
        $this->tempSubjectName = $value;
    }

    public function setGroupCodeAttribute($value): void
    {
        $this->attributes['grupo'] = (string) $value;
    }

    public function setAcademicTermAttribute($value): void
    {
        $this->attributes['gestion'] = (string) $value;
    }

    public function setTeacherIdAttribute($value): void
    {
        $this->attributes['docente_id'] = $value;
    }

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class, 'materia_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentCourseEnrollment::class, 'materia_grupo_id');
    }

    public function studentUsers(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'inscripcion',
            'materia_grupo_id',
            'usuario_id'
        )->withPivot('estado_inscripcion_id', 'motivo_inhabilitacion', 'fecha_inscripcion')->withTimestamps();
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class, 'materia_grupo_id');
    }

    // Accessors for backward compatibility
    public function getSubjectCodeAttribute(): string
    {
        return $this->course?->sigla ?? '';
    }

    public function getSubjectNameAttribute(): string
    {
        return $this->course?->nombre ?? '';
    }

    public function getGroupCodeAttribute(): string
    {
        return $this->grupo ?? '';
    }

    public function getAcademicTermAttribute(): string
    {
        return $this->gestion ?? '';
    }
}
