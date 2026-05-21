<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('payable_number', 30);
            $table->foreignId('partner_id')->constrained()->restrictOnDelete();

            $table->date('date');
            $table->date('due_date');
            $table->decimal('amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->text('description')->nullable();

            $table->foreignId('category_id')
                ->nullable()
                ->constrained('transaction_categories')
                ->nullOnDelete();

            $table->string('status', 20)->default('draft');
            $table->string('payment_status', 20)->default('unpaid');
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->text('void_reason')->nullable();

            $table->string('reference')->nullable();
            $table->jsonb('attachments')->nullable();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'date']);
            $table->index(['company_id', 'partner_id', 'payment_status']);
            $table->unique(['company_id', 'payable_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payables');
    }
};
