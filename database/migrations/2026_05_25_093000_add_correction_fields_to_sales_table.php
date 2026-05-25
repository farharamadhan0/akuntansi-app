<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('corrects_id')
                ->nullable()
                ->after('void_reason')
                ->constrained('sales')
                ->nullOnDelete();

            $table->foreignId('corrected_by_id')
                ->nullable()
                ->after('corrects_id')
                ->constrained('sales')
                ->nullOnDelete();

            $table->timestamp('corrected_at')->nullable()->after('corrected_by_id');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('corrects_id');
            $table->dropConstrainedForeignId('corrected_by_id');
            $table->dropColumn('corrected_at');
        });
    }
};
