<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SharedExamInvitation extends Model
{
    use HasFactory;

    protected $table = 'examen_compartido';

    protected $fillable = [
        'examen_id',
        'docente_invitado_id',
        'materia_grupo_id',
        'estado',
        'mensaje',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'examen_id');
    }

    public function invitedTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_invitado_id');
    }

    public function courseGroup(): BelongsTo
    {
        return $this->belongsTo(CourseGroup::class, 'materia_grupo_id');
    }
}
