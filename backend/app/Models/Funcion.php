<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Funcion extends Model
{
    protected $table = "funcion";


    protected $fillable = [
        "nombre",
        "numero",
        "activo"
    ];


    protected $casts = [
        "activo" => "boolean"
    ];


    public function roles()
    {
        return $this->belongsToMany(
            Rol::class,
            "rol_funcion",
            "funcion_id",
            "rol_id"
        );
    }


    public function interfaces()
    {
        return $this->belongsToMany(
            Ui::class,
            "funcion_ui",
            "funcion_id",
            "ui_id"
        );
    }
}