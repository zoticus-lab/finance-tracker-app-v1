<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Debt extends Model
{
    use HasFactory;

    protected $primaryKey = 'debt_id';

    protected $fillable = [
        'user_id',
        'creditor_name',
        'total_amount',
        'paid_amount',
        'remaining_amount',
        'description',
        'start_date',
        'due_date',
        'debt_status',
        'account_id',
        'priority',
        'color_code',
        'progress_percentage',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'start_date' => 'date',
        'due_date' => 'date',
    ];

    const STATUSES = ['active', 'completed', 'paused', 'defaulted'];
    const PRIORITIES = ['low', 'medium', 'high'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'account_id');
    }

    public function payments()
    {
        return $this->hasMany(DebtPayment::class, 'debt_id', 'debt_id');
    }

    // Helper methods
    public function isCompleted()
    {
        return $this->debt_status === 'completed' || $this->remaining_amount <= 0;
    }

    public function updateProgress()
    {
        $this->progress_percentage = ($this->total_amount > 0) 
            ? intval(($this->paid_amount / $this->total_amount) * 100)
            : 0;
        $this->remaining_amount = $this->total_amount - $this->paid_amount;
        
        if ($this->remaining_amount <= 0 && $this->debt_status !== 'completed') {
            $this->debt_status = 'completed';
        }
        
        $this->save();
    }
}
