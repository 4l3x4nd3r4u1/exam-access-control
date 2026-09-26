<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sesion extends Model
{
    protected $table = "sesion";

    protected $fillable = [
        "usuario_id",
        "pid",
        "fecha",
        "activo"
    ];


    protected $casts = [
        "fecha" => "datetime",
        "activo" => "boolean"
    ];


    public function usuario()
    {
        return $this->belongsTo(
            Usuario::class,
            "usuario_id"
        );
    }
}