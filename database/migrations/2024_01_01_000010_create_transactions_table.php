<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('transaction_number', 30);
            $table->string('type', 20);
            $table->date('date');
            $table->decimal('amount', 15, 2);
            $table->text('description')->nullable();

            $table->foreignId('cash_bank_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('destination_cash_bank_account_id')
                ->nullable()
                ->constrained('cash_bank_accounts')
                ->restrictOnDelete();
            $table->foreignId('category_id')
                ->nullable()
                ->constrained('transaction_categories')
                ->nullOnDelete();
            $table->foreignId('customer_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('supplier_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->string('status', 20)->default('draft');
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->text('void_reason')->nullable();

            $table->string('reference')->nullable();
            $table->jsonb('attachments')->nullable();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'date']);
            $table->index(['company_id', 'type', 'status']);
            $table->unique(['company_id', 'transaction_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
