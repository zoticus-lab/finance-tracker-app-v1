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
        Schema::create('debts', function (Blueprint $table) {
            $table->increments('debt_id');
            $table->integer('user_id');
            $table->string('creditor_name')->comment('Nama kreditor/orang yang memberikan pinjaman');
            $table->decimal('total_amount', 14, 2)->comment('Total hutang awal');
            $table->decimal('paid_amount', 14, 2)->default(0)->comment('Jumlah yang sudah dibayar');
            $table->decimal('remaining_amount', 14, 2)->comment('Sisa hutang');
            $table->text('description')->nullable();
            $table->date('start_date')->comment('Tanggal mulai hutang');
            $table->date('due_date')->nullable()->comment('Tanggal harus lunas');
            $table->enum('debt_status', ['active', 'completed', 'paused', 'defaulted'])->default('active');
            $table->integer('account_id')->nullable()->comment('Akun default untuk pembayaran');
            $table->string('priority')->default('medium');
            $table->string('color_code')->default('#e74c3c');
            $table->integer('progress_percentage')->default(0)->comment('Progress 0-100%');
            $table->timestamps();
            
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('account_id')->references('account_id')->on('accounts')->onDelete('set null');
            $table->index('user_id');
            $table->index('debt_status');
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('debts');
    }
};
