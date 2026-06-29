<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('onboarding_states', function (Blueprint $table) {
            $table->timestamp('completed_dismissed_at')->nullable()->after('skipped_at');
        });
    }

    public function down(): void
    {
        Schema::table('onboarding_states', function (Blueprint $table) {
            $table->dropColumn('completed_dismissed_at');
        });
    }
};
