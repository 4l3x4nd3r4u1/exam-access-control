<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    protected $table = "examen";


    protected $fillable = [
        "materia_grupo_id",
        "tipo_examen_id",
        "fecha",
        "hora_inicio",
        "hora_fin",
        "activo"
    ];


    protected $casts = [
        "activo" => "boolean",
        "fecha" => "date"
    ];


    public function materiaGrupo()
    {
        return $this->belongsTo(
            MateriaGrupo::class,
            "materia_grupo_id"
        );
    }


    public function tipo()
    {
        return $this->belongsTo(
            TipoExamen::class,
            "tipo_examen_id"
        );
    }


    public function normas()
    {
        return $this->hasMany(
            ExamenNorma::class,
            "examen_id"
        );
    }


    public function aulas()
    {
        return $this->belongsToMany(
            Aula::class,
            "examen_aula",
            "examen_id",
            "aula_id"
        );
    }


    public function estudiantes()
    {
        return $this->hasMany(
            ExamenEstudiante::class,
            "examen_id"
        );
    }
}