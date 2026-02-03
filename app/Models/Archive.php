<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Archive extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'title',
        'year',
        'drive_file_id',
        'view_link'
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
