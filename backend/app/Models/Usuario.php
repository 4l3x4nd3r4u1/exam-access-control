<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class Usuario extends Authenticatable implements JWTSubject
{
    protected $table = "usuario";


    protected $fillable = [
        "nombre",
        "contrasena",
        "activo",
        "email",
        "ci",
        "email_id"
    ];


    protected $hidden = [
        "contrasena"
    ];


    protected $casts = [
        "activo" => "boolean"
    ];


    public function getAuthPassword()
    {
        return $this->contrasena;
    }


    public function getJWTIdentifier()
    {
        return $this->getKey();
    }


    public function getJWTCustomClaims()
    {
        return [];
    }


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
            "rol_id",
        )->withPivot('activo', 'fecha_asignacion');
    }


    public function materias()
    {
        return $this->hasMany(
            MateriaGrupo::class,
            "docente_id"
        );
    }

    public function estudiante()
   {
        return $this->hasOne(
            Estudiante::class,
            'usuario_id'
        );
    }
}