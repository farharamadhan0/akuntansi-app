<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('route_name', 100)->nullable();
            $table->string('path', 255);
            $table->string('menu_key', 100)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('viewed_at');

            $table->index(['route_name', 'viewed_at']);
            $table->index(['company_id', 'viewed_at']);
            $table->index(['user_id', 'viewed_at']);
            $table->index('viewed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
