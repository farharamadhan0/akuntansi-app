<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('entry_number', 30);
            $table->date('date');
            $table->text('description')->nullable();

            $table->string('source_type')->nullable();
            $table->unsignedBigInteger('source_id')->nullable();

            $table->boolean('is_manual')->default(false);
            $table->boolean('is_adjusting')->default(false);
            $table->boolean('is_closing')->default(false);

            $table->string('status', 20)->default('posted');
            $table->timestamp('voided_at')->nullable();
            $table->text('void_reason')->nullable();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'date']);
            $table->unique(['company_id', 'entry_number']);
            $table->index(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
