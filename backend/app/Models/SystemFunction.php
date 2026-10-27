<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SystemFunction extends Model
{
    use HasFactory;

    protected $table = 'funcion';

    protected $fillable = [
        'nombre',
        'numero',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'rol_funcion', 'funcion_id', 'rol_id')
            ->withPivot(['activo', 'fecha_asignacion'])
            ->withTimestamps();
    }

    public function uis(): BelongsToMany
    {
        return $this->belongsToMany(UiComponent::class, 'funcion_ui', 'funcion_id', 'ui_id')
            ->withPivot(['activo', 'fecha_asignacion'])
            ->withTimestamps();
    }

    public function roleFunctions(): HasMany
    {
        return $this->hasMany(RoleFunction::class, 'funcion_id');
    }

    public function functionUis(): HasMany
    {
        return $this->hasMany(FunctionUi::class, 'funcion_id');
    }
}
