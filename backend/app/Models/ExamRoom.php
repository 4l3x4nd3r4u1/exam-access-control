<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamRoom extends Model
{
    use HasFactory;

    protected $table = 'examen_aula';
    public $incrementing = false;
    protected $primaryKey = ['examen_id', 'aula_id'];

    protected $fillable = [
        'examen_id',
        'aula_id',
        'cupo_asignado',
        'auxiliar_id',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'examen_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'aula_id');
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auxiliar_id');
    }

    // Accessors for backward compatibility
    public function getAssignedCapacityAttribute(): int
    {
        return (int) ($this->cupo_asignado ?? 0);
    }

    public function getRoomIdAttribute(): mixed
    {
        return $this->aula_id;
    }
}
