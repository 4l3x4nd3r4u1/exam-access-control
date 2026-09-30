<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aula extends Model
{
    protected $table = "aula";


    protected $fillable = [
        "nombre",
        "capacidad"
    ];


    public function examenes()
    {
        return $this->belongsToMany(
            Examen::class,
            "examen_aula",
            "aula_id",
            "examen_id"
        );
    }
}