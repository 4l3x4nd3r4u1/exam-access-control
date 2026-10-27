<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnrollmentStatus extends Model
{
    use HasFactory;

    protected $table = 'estado_inscripcion';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentCourseEnrollment::class, 'estado_inscripcion_id');
    }
}
