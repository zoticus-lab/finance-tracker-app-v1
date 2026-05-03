<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Credit extends Model
{
    use HasFactory;

    protected $primaryKey = 'credit_id';

    protected $fillable = [
        'user_id',
        'debtor_name',
        'total_amount',
        'received_amount',
        'remaining_amount',
        'description',
        'start_date',
        'due_date',
        'credit_status',
        'account_id',
        'priority',
        'color_code',
        'progress_percentage',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'received_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'start_date' => 'date',
        'due_date' => 'date',
    ];

    const STATUSES = ['active', 'completed', 'paused', 'written_off'];
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
        return $this->hasMany(CreditPayment::class, 'credit_id', 'credit_id');
    }

    // Helper methods
    public function isCompleted()
    {
        return $this->credit_status === 'completed' || $this->remaining_amount <= 0;
    }

    public function updateProgress()
    {
        $this->progress_percentage = ($this->total_amount > 0) 
            ? intval(($this->received_amount / $this->total_amount) * 100)
            : 0;
        $this->remaining_amount = $this->total_amount - $this->received_amount;
        
        if ($this->remaining_amount <= 0 && $this->credit_status !== 'completed') {
            $this->credit_status = 'completed';
        }
        
        $this->save();
    }
}
