<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $primaryKey = 'category_id';

    protected $fillable = [
        'user_id',
        'parent_category_id',
        'category_name',
        'category_type',
        'icon',
        'color_code',
        'is_system_default',
    ];

    protected $casts = [
        'is_system_default' => 'boolean',
    ];

    const TYPES = ['income', 'expense'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_category_id');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parent_category_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'category_id', 'category_id');
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }

    public function recurringTransactions()
    {
        return $this->hasMany(RecurringTransaction::class);
    }

    // Scopes
    public function scopeByType($query, $type)
    {
        return $query->where('category_type', $type);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_category_id');
    }

    public function scopeSystemDefault($query)
    {
        return $query->where('is_system_default', true);
    }

    // Methods
    public function isTopLevel()
    {
        return is_null($this->parent_category_id);
    }

    public function isSystemDefault()
    {
        return $this->is_system_default;
    }
}
