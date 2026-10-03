<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistroAccesoExamen extends Model
{
    protected $table = "registro_acceso_examen";


    protected $fillable = [
        "examen_id",
        "aula_id",
        "user_id_estudiante",
        "user_id_operador",
        "fecha",
        "hora",
        "resultado",
        "observacion"
    ];


    public function examen()
    {
        return $this->belongsTo(
            Examen::class,
            "examen_id"
        );
    }


    public function aula()
    {
        return $this->belongsTo(
            Aula::class,
            "aula_id"
        );
    }


    public function estudiante()
    {
        return $this->belongsTo(
            Usuario::class,
            "user_id_estudiante"
        );
    }


    public function operador()
    {
        return $this->belongsTo(
            Usuario::class,
            "user_id_operador"
        );
    }
}