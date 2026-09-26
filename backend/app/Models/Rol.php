<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rol extends Model
{
    protected $table = "rol";


    protected $fillable = [
        "nombre",
        "descripcion",
        "activo"
    ];


    protected $casts = [
        "activo" => "boolean"
    ];


    public function usuarios()
    {
        return $this->belongsToMany(
            Usuario::class,
            "usuario_rol",
            "rol_id",
            "usuario_id"
        );
    }


    public function funciones()
    {
        return $this->belongsToMany(
            Funcion::class,
            "rol_funcion",
            "rol_id",
            "funcion_id"
        );
    }
}