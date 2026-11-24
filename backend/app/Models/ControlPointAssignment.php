<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ControlPointAssignment extends Model
{
    protected $table = 'control_point_assignments';

    protected $fillable = [
        'control_point_id',
        'user_id',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function controlPoint(): BelongsTo
    {
        return $this->belongsTo(
            ControlPoint::class,
            'control_point_id'
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'user_id'
        );
    }
}