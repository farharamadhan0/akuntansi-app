<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->string('category', 50)->default('question')->after('company_id');
            $table->string('status', 50)->default('open')->after('message');
            $table->string('image_path', 255)->nullable()->after('page_url');
            $table->text('developer_response')->nullable()->after('user_agent');
            $table->foreignId('responded_by')->nullable()->after('developer_response')->constrained('users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable()->after('responded_by');

            $table->index(['status', 'created_at']);
            $table->index(['category', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropForeign(['responded_by']);
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['category', 'created_at']);
            $table->dropColumn([
                'category',
                'status',
                'image_path',
                'developer_response',
                'responded_by',
                'responded_at',
            ]);
        });
    }
};
