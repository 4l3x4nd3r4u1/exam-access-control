<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ui extends Model
{
    protected $table = "ui";


    protected $fillable = [
        "nombre",
        "descripcion",
        "activo"
    ];


    protected $casts = [
        "activo" => "boolean"
    ];
}