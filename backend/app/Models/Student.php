<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Student extends Model
{
    use HasFactory;

    protected $table = 'students';
    protected $primaryKey = 'student_key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'student_key',
        'ci',
        'full_name',
    ];

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentCourseEnrollment::class, 'student_key', 'student_key');
    }

    public function courseGroups(): BelongsToMany
    {
        return $this->belongsToMany(
            CourseGroup::class,
            'student_course_enrollments',
            'student_key',
            'course_group_id'
        )->withPivot('status', 'ineligibility_reason')->withTimestamps();
    }
}
