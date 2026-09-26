<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EstadoExamenEstudiante extends Model
{
    protected $table = "estado_examen_estudiante";


    protected $fillable = [
        "nombre",
        "descripcion"
    ];


    public function estudiantes()
    {
        return $this->hasMany(
            ExamenEstudiante::class,
            "estado_id"
        );
    }
}