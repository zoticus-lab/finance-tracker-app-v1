<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('credit_payments', function (Blueprint $table) {
            $table->increments('payment_id');
            $table->integer('credit_id')->unsigned();
            $table->integer('user_id');
            $table->integer('account_id')->comment('Akun mana yang menerima pembayaran');
            $table->decimal('payment_amount', 14, 2);
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->string('payment_method')->default('cash')->comment('cash, bank transfer, etc');
            $table->timestamps();
            
            $table->foreign('credit_id')->references('credit_id')->on('credits')->onDelete('cascade');
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('account_id')->references('account_id')->on('accounts')->onDelete('restrict');
            $table->index('credit_id');
            $table->index('user_id');
            $table->index('payment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_payments');
    }
};
