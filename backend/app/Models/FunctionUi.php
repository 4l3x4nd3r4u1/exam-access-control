<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FunctionUi extends Model
{
    use HasFactory;

    protected $table = 'funcion_ui';
    public $incrementing = false;
    protected $primaryKey = ['funcion_id', 'ui_id'];

    protected $fillable = [
        'funcion_id',
        'ui_id',
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

    public function function(): BelongsTo
    {
        return $this->belongsTo(SystemFunction::class, 'funcion_id');
    }

    public function ui(): BelongsTo
    {
        return $this->belongsTo(UiComponent::class, 'ui_id');
    }
}
