<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory;

    protected $table = 'rooms';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'room_name',
        'max_capacity',
    ];

    public function examRooms(): HasMany
    {
        return $this->hasMany(ExamRoom::class, 'room_id', 'id');
    }

    public function examStudents(): HasMany
    {
        return $this->hasMany(ExamStudent::class, 'assigned_room_id', 'id');
    }
}
