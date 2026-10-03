<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use HasFactory;

    protected $table = 'rol';

    protected $fillable = [
        'nombre',
        'descripcion',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'usuario_rol', 'rol_id', 'usuario_id')
            ->withPivot(['activo', 'fecha_asignacion'])
            ->withTimestamps();
    }

    public function functions(): BelongsToMany
    {
        return $this->belongsToMany(SystemFunction::class, 'rol_funcion', 'rol_id', 'funcion_id')
            ->withPivot(['activo', 'fecha_asignacion'])
            ->withTimestamps();
    }
}
