<?php

namespace App\Models;

/**
 * Alias for ExamInvitation to keep full backward compatibility.
 */
class SharedExamInvitation extends ExamInvitation
{
    protected $table = 'examen_invitacion';
}
