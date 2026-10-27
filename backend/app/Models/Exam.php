<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    use HasFactory;

    protected $table = 'examen';

    protected $fillable = [
        'materia_grupo_id',
        'tipo_examen_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'activo' => 'boolean',
        ];
    }

    public function courseGroup(): BelongsTo
    {
        return $this->belongsTo(CourseGroup::class, 'materia_grupo_id');
    }

    public function examType(): BelongsTo
    {
        return $this->belongsTo(ExamType::class, 'tipo_examen_id');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(ExamRule::class, 'examen_id');
    }

    public function rooms(): BelongsToMany
    {
        return $this->belongsToMany(
            Room::class,
            'examen_aula',
            'examen_id',
            'aula_id'
        )->withPivot('cupo_asignado', 'auxiliar_id')->withTimestamps();
    }

    public function examRooms(): HasMany
    {
        return $this->hasMany(ExamRoom::class, 'examen_id');
    }

    public function examStudents(): HasMany
    {
        return $this->hasMany(ExamStudent::class, 'examen_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AccessAuditLog::class, 'exam_id');
    }

    // Accessors for backward compatibility
    public function getTitleAttribute(): string
    {
        return $this->examType?->nombre ?? 'Examen';
    }

    public function getExamDateAttribute(): mixed
    {
        return $this->fecha;
    }

    public function getStartTimeAttribute(): mixed
    {
        return $this->hora_inicio;
    }

    public function getEndTimeAttribute(): mixed
    {
        return $this->hora_fin;
    }

    public function getCourseGroupIdAttribute(): string
    {
        return (string) $this->materia_grupo_id;
    }
}
