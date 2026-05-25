<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->foreignId('corrects_id')
                ->nullable()
                ->after('void_reason')
                ->constrained('purchases')
                ->nullOnDelete();

            $table->foreignId('corrected_by_id')
                ->nullable()
                ->after('corrects_id')
                ->constrained('purchases')
                ->nullOnDelete();

            $table->timestamp('corrected_at')->nullable()->after('corrected_by_id');
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('corrects_id');
            $table->dropConstrainedForeignId('corrected_by_id');
            $table->dropColumn('corrected_at');
        });
    }
};
