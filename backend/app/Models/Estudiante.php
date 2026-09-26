<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Estudiante extends Model
{
    protected $table = "estudiante";

    protected $primaryKey = "codigo_sis";

    public $incrementing = false;

    protected $keyType = "int";


    protected $fillable = [
        "codigo_sis",
        "usuario_id"
    ];


    public function usuario()
    {
        return $this->belongsTo(
            Usuario::class,
            "usuario_id"
        );
    }


    public function inscripciones()
    {
        return $this->hasMany(
            Inscripcion::class,
            "usuario_id",
            "usuario_id"
        );
    }
}