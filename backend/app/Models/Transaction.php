<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $primaryKey = 'transaction_id';

    protected $fillable = [
        'user_id',
        'account_id',
        'transaction_type',
        'amount',
        'category_id',
        'description',
        'transaction_date',
        'transaction_time',
        'notes',
        'receipt_url',
        'is_recurring',
        'recurring_pattern',
        'tags',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
        'transaction_time' => 'datetime',
        'is_recurring' => 'boolean',
    ];

    const TYPES = ['income', 'expense', 'transfer'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'account_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function transfer()
    {
        return $this->hasOne(Transfer::class, 'transaction_id');
    }

    // Scopes
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByAccount($query, $accountId)
    {
        return $query->where('account_id', $accountId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    public function scopeByCategory($query, $categoryId)
    {
        return $query->where('category_id', $categoryId);
    }

    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('transaction_date', [$startDate, $endDate]);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('transaction_date', '>=', now()->subDays($days));
    }

    // Methods
    public function isIncome()
    {
        return $this->transaction_type === 'income';
    }

    public function isExpense()
    {
        return $this->transaction_type === 'expense';
    }

    public function isTransfer()
    {
        return $this->transaction_type === 'transfer';
    }
}
