<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Exam extends Model
{
    use HasFactory;

    protected $table = 'exams';

    protected $fillable = [
        'course_group_id',
        'title',
        'exam_date',
        'start_time',
        'end_time',
    ];

    protected function casts(): array
    {
        return [
            'exam_date' => 'date',
        ];
    }

    public function courseGroup(): BelongsTo
    {
        return $this->belongsTo(CourseGroup::class, 'course_group_id', 'course_group_id');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(ExamRule::class, 'exam_id', 'id');
    }

    public function rooms(): BelongsToMany
    {
        return $this->belongsToMany(
            Room::class,
            'exam_rooms',
            'exam_id',
            'room_id'
        )->withPivot('assigned_capacity')->withTimestamps();
    }

    public function examStudents(): HasMany
    {
        return $this->hasMany(ExamStudent::class, 'exam_id', 'id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AccessAuditLog::class, 'exam_id', 'id');
    }
}
