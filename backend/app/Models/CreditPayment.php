<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditPayment extends Model
{
    use HasFactory;

    protected $primaryKey = 'payment_id';
    protected $table = 'credit_payments';

    protected $fillable = [
        'credit_id',
        'user_id',
        'account_id',
        'payment_amount',
        'payment_date',
        'notes',
        'payment_method',
    ];

    protected $casts = [
        'payment_amount' => 'decimal:2',
        'payment_date' => 'date',
    ];

    // Relationships
    public function credit()
    {
        return $this->belongsTo(Credit::class, 'credit_id', 'credit_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id', 'account_id');
    }
}
