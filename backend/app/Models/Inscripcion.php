<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inscripcion extends Model
{
    protected $table = "inscripcion";
    protected $primaryKey = null;
    public $incrementing = false;
    protected $keyType = null;

    protected $fillable = [
        "usuario_id",
        "materia_grupo_id",
        "estado_inscripcion_id",
        "motivo_inhabilitacion",
        "fecha_inscripcion"
    ];


    protected $casts = [
        "fecha_inscripcion" => "datetime"
    ];


    public function estudiante()
    {
        return $this->belongsTo(
            Estudiante::class,
            "usuario_id",
            "usuario_id"
        );
    }


    public function materiaGrupo()
    {
        return $this->belongsTo(
            MateriaGrupo::class,
            "materia_grupo_id"
        );
    }


    public function estado()
    {
        return $this->belongsTo(
            EstadoInscripcion::class,
            "estado_inscripcion_id"
        );
    }
}