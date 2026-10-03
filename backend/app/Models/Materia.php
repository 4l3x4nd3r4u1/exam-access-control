<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Materia extends Model
{
    protected $table = "materia";


    protected $fillable = [
        "sigla",
        "nombre",
        "activo"
    ];


    protected $casts = [
        "activo" => "boolean"
    ];


    public function grupos()
    {
        return $this->hasMany(
            MateriaGrupo::class,
            "materia_id"
        );
    }
}