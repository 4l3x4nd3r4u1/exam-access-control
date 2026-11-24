<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ControlPoint extends Model
{
    public const ENTRY = 'ENTRY';

    public const DURING_EXAM = 'DURING_EXAM';

    protected $table = 'control_points';

    protected $fillable = [
        'exam_id',
        'room_id',
        'control_type',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(
            Exam::class,
            'exam_id'
        );
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(
            Room::class,
            'room_id'
        );
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(
            ControlPointAssignment::class,
            'control_point_id'
        );
    }

    public function activeAssignments(): HasMany
    {
        return $this->assignments()
            ->whereNull('ended_at');
    }
}