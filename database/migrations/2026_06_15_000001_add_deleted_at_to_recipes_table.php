<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('recipes', 'deleted_at')) {
            Schema::table('recipes', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('recipes', 'deleted_at')) {
            Schema::table('recipes', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
