<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EstadoInscripcion extends Model
{
    protected $table = "estado_inscripcion";


    protected $fillable = [
        "nombre",
        "descripcion"
    ];
}