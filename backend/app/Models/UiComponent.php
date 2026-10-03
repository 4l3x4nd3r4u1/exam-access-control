<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UiComponent extends Model
{
    use HasFactory;

    protected $table = 'ui';

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

    public function functions(): BelongsToMany
    {
        return $this->belongsToMany(
            SystemFunction::class,
            'funcion_ui',
            'ui_id',
            'funcion_id'
        )->withPivot(['activo', 'fecha_asignacion'])->withTimestamps();
    }

    public function functionUis(): HasMany
    {
        return $this->hasMany(FunctionUi::class, 'ui_id');
    }
}
