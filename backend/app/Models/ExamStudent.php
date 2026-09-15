<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamStudent extends Model
{
    use HasFactory;

    protected $table = 'exam_students';
    public $incrementing = false;

    protected $fillable = [
        'exam_id',
        'student_key',
        'assigned_room_id',
        'check_in_time',
        'attendance_status',
        'expulsion_time',
        'incident_reason',
    ];

    protected function casts(): array
    {
        return [
            'check_in_time' => 'datetime',
            'expulsion_time' => 'datetime',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_key', 'student_key');
    }

    public function assignedRoom(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'assigned_room_id', 'id');
    }
}
