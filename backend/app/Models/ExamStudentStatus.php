<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamStudentStatus extends Model
{
    use HasFactory;

    protected $table = 'estado_examen_estudiante';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function examStudents(): HasMany
    {
        return $this->hasMany(ExamStudent::class, 'estado_id');
    }
}
