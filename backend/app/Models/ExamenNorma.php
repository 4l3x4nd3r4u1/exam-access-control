<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenNorma extends Model
{
    protected $table = "examen_norma";


    protected $fillable = [
        "examen_id",
        "descripcion"
    ];


    public function examen()
    {
        return $this->belongsTo(
            Examen::class,
            "examen_id"
        );
    }
}