<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CourseGroup extends Model
{
    use HasFactory;

    protected $table = 'course_groups';
    protected $primaryKey = 'course_group_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'course_group_id',
        'subject_code',
        'subject_name',
        'group_code',
        'academic_term',
        'teacher_id',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentCourseEnrollment::class, 'course_group_id', 'course_group_id');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(
            Student::class,
            'student_course_enrollments',
            'course_group_id',
            'student_key'
        )->withPivot('status', 'ineligibility_reason')->withTimestamps();
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class, 'course_group_id', 'course_group_id');
    }
}
