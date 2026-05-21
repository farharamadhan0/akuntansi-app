<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('sale_number', 30);
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            $table->date('due_date')->nullable();
            $table->string('payment_type', 20);
            $table->foreignId('cash_bank_account_id')->nullable()->constrained('cash_bank_accounts')->nullOnDelete();
            $table->foreignId('receivable_id')->nullable()->constrained('receivables')->nullOnDelete();
            $table->decimal('subtotal', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->string('reference')->nullable();
            $table->jsonb('attachments')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'sale_number']);
            $table->index(['company_id', 'date']);
            $table->index(['company_id', 'partner_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
