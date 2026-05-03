<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Goal extends Model
{
    use HasFactory;

    protected $primaryKey = 'goal_id';

    protected $fillable = [
        'user_id',
        'account_id',
        'goal_name',
        'target_amount',
        'current_amount',
        'target_date',
        'goal_status',
        'goal_category',
        'color_code',
        'icon',
        'description',
        'priority',
        'completed_at',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'current_amount' => 'decimal:2',
        'target_date' => 'date',
        'completed_at' => 'datetime',
    ];

    const STATUSES = ['active', 'completed', 'abandoned', 'paused'];
    const PRIORITIES = ['low', 'medium', 'high'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    // Scopes
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeActive($query)
    {
        return $query->where('goal_status', 'active');
    }

    public function scopeCompleted($query)
    {
        return $query->where('goal_status', 'completed');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('goal_status', $status);
    }

    // Methods
    public function getProgressPercentage()
    {
        if ($this->target_amount == 0) {
            return 0;
        }
        return round(($this->current_amount / $this->target_amount) * 100, 2);
    }

    public function getRemainingAmount()
    {
        return max(0, $this->target_amount - $this->current_amount);
    }

    public function getDaysRemaining()
    {
        if (is_null($this->target_date)) {
            return null;
        }
        $remaining = now()->diffInDays($this->target_date);
        return $remaining >= 0 ? $remaining : -$remaining;
    }

    public function isCompleted()
    {
        return $this->goal_status === 'completed';
    }

    public function markAsCompleted()
    {
        $this->goal_status = 'completed';
        $this->completed_at = now();
        $this->save();
    }
}
