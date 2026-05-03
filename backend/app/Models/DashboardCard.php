<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DashboardCard extends Model
{
    use HasFactory;

    protected $primaryKey = 'card_config_id';

    protected $fillable = [
        'user_id',
        'card_type',
        'card_title',
        'is_enabled',
        'card_position',
        'card_size',
        'layout_column',
        'custom_config',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'custom_config' => 'array',
    ];

    const SIZES = ['small', 'medium', 'large'];
    const CARD_TYPES = [
        'balance_trend',
        'cash_flow',
        'expenses_structure',
        'budget_overview',
        'goal_progress',
        'last_records',
        'account_summary',
        'net_worth',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('card_position', 'asc');
    }

    // Methods
    public function isEnabled()
    {
        return $this->is_enabled;
    }
}
