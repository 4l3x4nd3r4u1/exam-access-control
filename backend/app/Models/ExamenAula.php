<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenAula extends Model
{
    protected $table = "examen_aula";


    public $incrementing = false;


    protected $fillable = [
        "examen_id",
        "aula_id",
        "cupo_asignado",
        "auxiliar_id"
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


    public function auxiliar()
    {
        return $this->belongsTo(
            Usuario::class,
            "auxiliar_id"
        );
    }
}