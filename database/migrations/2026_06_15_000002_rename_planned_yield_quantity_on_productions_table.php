<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('productions', 'planned_yield_quantity') && ! Schema::hasColumn('productions', 'recipe_yield_quantity')) {
            Schema::table('productions', function (Blueprint $table) {
                $table->renameColumn('planned_yield_quantity', 'recipe_yield_quantity');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('productions', 'recipe_yield_quantity') && ! Schema::hasColumn('productions', 'planned_yield_quantity')) {
            Schema::table('productions', function (Blueprint $table) {
                $table->renameColumn('recipe_yield_quantity', 'planned_yield_quantity');
            });
        }
    }
};
