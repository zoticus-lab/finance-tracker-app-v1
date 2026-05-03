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
        Schema::create('credits', function (Blueprint $table) {
            $table->increments('credit_id');
            $table->integer('user_id');
            $table->string('debtor_name')->comment('Nama orang yang berhutang');
            $table->decimal('total_amount', 14, 2)->comment('Total piutang awal');
            $table->decimal('received_amount', 14, 2)->default(0)->comment('Jumlah yang sudah diterima');
            $table->decimal('remaining_amount', 14, 2)->comment('Sisa piutang');
            $table->text('description')->nullable();
            $table->date('start_date')->comment('Tanggal mulai piutang');
            $table->date('due_date')->nullable()->comment('Tanggal harus dibayar');
            $table->enum('credit_status', ['active', 'completed', 'paused', 'written_off'])->default('active');
            $table->integer('account_id')->nullable()->comment('Akun penerima pembayaran default');
            $table->string('priority')->default('medium');
            $table->string('color_code')->default('#27ae60');
            $table->integer('progress_percentage')->default(0)->comment('Progress 0-100%');
            $table->timestamps();
            
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('account_id')->references('account_id')->on('accounts')->onDelete('set null');
            $table->index('user_id');
            $table->index('credit_status');
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credits');
    }
};
