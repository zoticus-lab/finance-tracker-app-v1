<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    use HasFactory;

    protected $primaryKey = 'budget_id';

    protected $fillable = [
        'user_id',
        'category_id',
        'budget_name',
        'budget_limit',
        'period_type',
        'period_start_date',
        'period_end_date',
        'spent_amount',
        'overspend_warning',
        'alert_threshold',
        'description',
        'color_code',
        'is_active',
    ];

    protected $casts = [
        'budget_limit' => 'decimal:2',
        'spent_amount' => 'decimal:2',
        'alert_threshold' => 'decimal:2',
        'overspend_warning' => 'boolean',
        'is_active' => 'boolean',
        'period_start_date' => 'date',
        'period_end_date' => 'date',
    ];

    const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    // Scopes
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrentPeriod($query)
    {
        return $query->where('period_start_date', '<=', now())
                     ->where('period_end_date', '>=', now());
    }

    // Methods
    public function getSpentPercentage()
    {
        if ($this->budget_limit == 0) {
            return 0;
        }
        return round(($this->spent_amount / $this->budget_limit) * 100, 2);
    }

    public function getRemainingAmount()
    {
        return max(0, $this->budget_limit - $this->spent_amount);
    }

    public function getStatus()
    {
        if ($this->spent_amount > $this->budget_limit) {
            return 'overspent';
        }
        if ($this->getSpentPercentage() >= $this->alert_threshold) {
            return 'warning';
        }
        return 'on_track';
    }

    public function isOverspent()
    {
        return $this->spent_amount > $this->budget_limit;
    }
}
