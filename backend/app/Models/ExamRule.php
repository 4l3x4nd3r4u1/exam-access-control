<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamRule extends Model
{
    use HasFactory;

    protected $table = 'examen_norma';

    protected $fillable = [
        'examen_id',
        'descripcion',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'examen_id');
    }

    // Accessors for backward compatibility
    public function getRuleDescriptionAttribute(): string
    {
        return $this->descripcion ?? '';
    }
}
