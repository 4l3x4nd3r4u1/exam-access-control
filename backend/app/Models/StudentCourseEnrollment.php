<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentCourseEnrollment extends Model
{
    use HasFactory;

    protected $table = 'student_course_enrollments';
    public $incrementing = false;

    protected $fillable = [
        'student_key',
        'course_group_id',
        'status',
        'ineligibility_reason',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_key', 'student_key');
    }

    public function courseGroup(): BelongsTo
    {
        return $this->belongsTo(CourseGroup::class, 'course_group_id', 'course_group_id');
    }
}
