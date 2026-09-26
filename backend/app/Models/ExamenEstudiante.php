<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenEstudiante extends Model
{
    protected $table = "examen_estudiante";


    public $incrementing = false;


    protected $fillable = [
        "examen_id",
        "usuario_id",
        "aula_id",
        "estado_id",
        "hora_ingreso",
        "observaciones",
        "motivo_expulsion"
    ];


    protected $casts = [
        "hora_ingreso" => "datetime"
    ];


    public function examen()
    {
        return $this->belongsTo(
            Examen::class,
            "examen_id"
        );
    }


    public function estudiante()
    {
        return $this->belongsTo(
            Usuario::class,
            "usuario_id"
        );
    }


    public function aula()
    {
        return $this->belongsTo(
            Aula::class,
            "aula_id"
        );
    }


    public function estado()
    {
        return $this->belongsTo(
            EstadoExamenEstudiante::class,
            "estado_id"
        );
    }
}