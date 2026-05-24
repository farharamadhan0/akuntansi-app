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
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('corrected_by_id')
                ->nullable()
                ->after('void_reason')
                ->constrained('transactions')
                ->nullOnDelete();

            $table->foreignId('corrects_id')
                ->nullable()
                ->after('corrected_by_id')
                ->constrained('transactions')
                ->nullOnDelete();

            $table->timestamp('corrected_at')->nullable()->after('corrects_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['corrected_by_id']);
            $table->dropForeign(['corrects_id']);
            $table->dropColumn(['corrected_by_id', 'corrects_id', 'corrected_at']);
        });
    }
};
