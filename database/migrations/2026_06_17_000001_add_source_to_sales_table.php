<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('source', 20)->default('manual')->after('payment_type');
            $table->index(['company_id', 'source', 'date']);
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'source', 'date']);
            $table->dropColumn('source');
        });
    }
};
