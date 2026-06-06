<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feedback_id')->constrained('feedback')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sender_type', 20);
            $table->text('message');
            $table->timestamps();

            $table->index(['feedback_id', 'created_at']);
            $table->index(['sender_type', 'created_at']);
        });

        DB::table('feedback')
            ->orderBy('id')
            ->get()
            ->each(function ($feedback) {
                if (! empty($feedback->developer_response)) {
                    DB::table('feedback_messages')->insert([
                        'feedback_id' => $feedback->id,
                        'user_id' => $feedback->responded_by,
                        'sender_type' => 'developer',
                        'message' => $feedback->developer_response,
                        'created_at' => $feedback->responded_at ?? $feedback->updated_at,
                        'updated_at' => $feedback->responded_at ?? $feedback->updated_at,
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_messages');
    }
};
