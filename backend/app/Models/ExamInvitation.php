<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamInvitation extends Model
{
    use HasFactory;

    public const MAIL_PENDING = 'PENDIENTE';
    public const MAIL_SENT = 'ENVIADO';
    public const MAIL_FAILED = 'FALLIDO';

    protected $table = 'examen_invitacion';

    protected $fillable = [
        'examen_id',
        'docente_invitado_id',
        'docente_invitador_id',
        'materia_grupo_id',
        'materia_grupo_ids',
        'estado',
        'mensaje',
        'correo_estado',
        'correo_enviado_en',
    ];

    protected function casts(): array
    {
        return [
            'correo_enviado_en' => 'datetime',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'examen_id');
    }

    public function courseGroup(): BelongsTo
    {
        return $this->belongsTo(CourseGroup::class, 'materia_grupo_id');
    }

    public function invitedTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_invitado_id');
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_invitador_id');
    }
}
