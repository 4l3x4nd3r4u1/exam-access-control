<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamType extends Model
{
    use HasFactory;

    protected $table = 'tipo_examen';

    protected $fillable = [
        'nombre',
    ];

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class, 'tipo_examen_id');
    }
}
