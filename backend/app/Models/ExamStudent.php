<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamStudent extends Model
{
    use HasFactory;

    protected $table = 'examen_estudiante';
    public $incrementing = false;
    protected $primaryKey = ['examen_id', 'usuario_id'];

    protected $fillable = [
        'examen_id',
        'usuario_id',
        'aula_id',
        'estado_id',
        'hora_ingreso',
        'observaciones',
        'motivo_expulsion',
    ];

    protected function casts(): array
    {
        return [
            'hora_ingreso' => 'datetime',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'examen_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'usuario_id', 'usuario_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'aula_id');
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(ExamStudentStatus::class, 'estado_id');
    }

    // Accessors for backward compatibility
    public function getStudentKeyAttribute(): string
    {
        return (string) ($this->student?->codigo_sis ?? '');
    }

    public function getAssignedRoomIdAttribute(): mixed
    {
        return $this->aula_id;
    }

    public function getAttendanceStatusAttribute(): string
    {
        return $this->status?->nombre ?? '';
    }

    public function getCheckInTimeAttribute(): mixed
    {
        return $this->hora_ingreso;
    }

    public function getIncidentReasonAttribute(): ?string
    {
        return $this->motivo_expulsion;
    }
}
