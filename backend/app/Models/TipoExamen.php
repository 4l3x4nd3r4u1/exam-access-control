<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoExamen extends Model
{
    protected $table = "tipo_examen";


    protected $fillable = [
        "nombre"
    ];


    public function examenes()
    {
        return $this->hasMany(
            Examen::class,
            "tipo_examen_id"
        );
    }
}