<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccessAuditLog extends Model
{
    use HasFactory;

    protected $table = 'registro_acceso_examen';

    protected $fillable = [
        'exam_id',
        'aula_id',
        'user_id_estudiante',
        'user_id_operador',
        'fecha',
        'hora',
        'resultado',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'aula_id');
    }

    public function studentUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id_estudiante');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'user_id_estudiante', 'usuario_id');
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id_operador');
    }

    public function supervisor(): BelongsTo
    {
        return $this->operator();
    }

    // Accessors for backward compatibility
    public function getStudentKeyAttribute(): string
    {
        return (string) ($this->student?->codigo_sis ?? '');
    }

    public function getEventTypeAttribute(): string
    {
        return $this->resultado ?? '';
    }

    public function getReasonDetailsAttribute(): ?string
    {
        return $this->observacion;
    }

    public function getSupervisorIdAttribute(): mixed
    {
        return $this->user_id_operador;
    }

    public function getRoomIdAttribute(): mixed
    {
        return $this->aula_id;
    }
}
