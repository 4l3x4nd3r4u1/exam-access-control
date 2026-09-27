<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MateriaGrupo extends Model
{
    protected $table = "materia_grupo";


    protected $fillable = [
        "materia_id",
        "grupo",
        "gestion",
        "docente_id",
        "activo"
    ];


    protected $casts = [
        "activo" => "boolean"
    ];


    public function materia()
    {
        return $this->belongsTo(
            Materia::class,
            "materia_id"
        );
    }


    public function docente()
    {
        return $this->belongsTo(
            Usuario::class,
            "docente_id"
        );
    }


    public function inscripciones()
    {
        return $this->hasMany(
            Inscripcion::class,
            "materia_grupo_id"
        );
    }


    public function examenes()
    {
        return $this->hasMany(
            Examen::class,
            "materia_grupo_id"
        );
    }
}