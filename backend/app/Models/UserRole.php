<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserRole extends Model
{
    use HasFactory;

    protected $table = 'usuario_rol';
    public $incrementing = false;
    protected $primaryKey = ['usuario_id', 'rol_id'];

    protected $fillable = [
        'usuario_id',
        'rol_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }
}
