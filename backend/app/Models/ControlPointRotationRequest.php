<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ControlPointRotationRequest extends Model
{
    public const PENDING = 'PENDING';

    public const ACCEPTED = 'ACCEPTED';

    public const REJECTED = 'REJECTED';

    protected $table = 'control_point_rotation_requests';

    protected $fillable = [
        'requester_assignment_id',
        'receiver_assignment_id',
        'status',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
    }

    public function requesterAssignment(): BelongsTo
    {
        return $this->belongsTo(
            ControlPointAssignment::class,
            'requester_assignment_id'
        );
    }

    public function receiverAssignment(): BelongsTo
    {
        return $this->belongsTo(
            ControlPointAssignment::class,
            'receiver_assignment_id'
        );
    }
}