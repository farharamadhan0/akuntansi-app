<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    public function sendMessage(string $message, string $channel = 'feedback'): bool
    {
        $config = (array) config("services.telegram.{$channel}", []);
        $enabled = (bool) ($config['enabled'] ?? true);
        $botToken = (string) ($config['bot_token'] ?? '');
        $chatId = (string) ($config['chat_id'] ?? '');

        if (! $enabled || blank($botToken) || blank($chatId)) {
            return false;
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

            return true;
        } catch (\Throwable $exception) {
            Log::warning('Telegram notification failed.', [
                'channel' => $channel,
                'message' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    public function sendFeedbackMessage(string $message): bool
    {
        return $this->sendMessage($message, 'feedback');
    }

    public function sendErrorMessage(string $message): bool
    {
        return $this->sendMessage($message, 'error');
    }
}
