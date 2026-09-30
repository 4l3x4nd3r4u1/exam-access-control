<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory;

    protected $table = 'aula';

    protected $fillable = [
        'nombre',
        'capacidad',
    ];

    public function examRooms(): HasMany
    {
        return $this->hasMany(ExamRoom::class, 'aula_id');
    }

    public function exams(): BelongsToMany
    {
        return $this->belongsToMany(
            Exam::class,
            'examen_aula',
            'aula_id',
            'examen_id'
        )->withPivot('cupo_asignado', 'auxiliar_id')->withTimestamps();
    }

    public function examStudents(): HasMany
    {
        return $this->hasMany(ExamStudent::class, 'aula_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AccessAuditLog::class, 'aula_id');
    }

    // Accessors for backward compatibility
    public function getRoomNameAttribute(): string
    {
        return $this->nombre ?? '';
    }

    public function getMaxCapacityAttribute(): int
    {
        return (int) ($this->capacidad ?? 0);
    }
}
