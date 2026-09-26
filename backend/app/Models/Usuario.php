<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Usuario extends Model
{
    protected $table = "usuario";

    protected $fillable = [
        "nombre",
        "contrasena",
        "activo",
        "email",
        "ci"
    ];

    protected $casts = [
        "activo" => "boolean"
    ];


    public function sesiones()
    {
        return $this->hasMany(
            Sesion::class,
            "usuario_id"
        );
    }


    public function roles()
    {
        return $this->belongsToMany(
            Rol::class,
            "usuario_rol",
            "usuario_id",
            "rol_id"
        );
    }


    public function materias()
    {
        return $this->hasMany(
            MateriaGrupo::class,
            "docente_id"
        );
    }
}