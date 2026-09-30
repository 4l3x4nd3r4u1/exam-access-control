<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoleFunction extends Model
{
    use HasFactory;

    protected $table = 'rol_funcion';
    public $incrementing = false;
    protected $primaryKey = ['rol_id', 'funcion_id'];

    protected $fillable = [
        'rol_id',
        'funcion_id',
        'activo',
        'fecha_asignacion',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'fecha_asignacion' => 'datetime',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }

    public function function(): BelongsTo
    {
        return $this->belongsTo(SystemFunction::class, 'funcion_id');
    }
}
