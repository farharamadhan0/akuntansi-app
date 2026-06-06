<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    public function sendMessage(string $message): void
    {
        $enabled = (bool) config('services.telegram.enabled', true);
        $botToken = (string) config('services.telegram.bot_token', '');
        $chatId = (string) config('services.telegram.chat_id', '');

        if (! $enabled || blank($botToken) || blank($chatId)) {
            return;
        }

        try {
            Http::asForm()
                ->timeout(10)
                ->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $message,
                    'parse_mode' => 'HTML',
                    'disable_web_page_preview' => true,
                ])
                ->throw();
        } catch (\Throwable $exception) {
            Log::warning('Telegram notification failed.', [
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
