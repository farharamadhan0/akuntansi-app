<?php

namespace App\Support;

use App\Models\ErrorLog;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

class ErrorLogRecorder
{
    private static bool $recording = false;

    public function recordThrowable(Throwable $throwable, string $level = 'CRITICAL', array $context = []): void
    {
        $this->record([
            'level' => strtoupper($level),
            'message' => $throwable->getMessage() ?: class_basename($throwable),
            'exception_class' => $throwable::class,
            'file' => $throwable->getFile(),
            'line' => $throwable->getLine(),
            'trace' => $throwable->getTraceAsString(),
            'context' => $context,
        ]);
    }

    public function recordMessage(string $message, string $level = 'CRITICAL', array $context = []): void
    {
        $exception = $context['exception'] ?? null;

        $this->record([
            'level' => strtoupper($level),
            'message' => $message,
            'exception_class' => $exception instanceof Throwable ? $exception::class : null,
            'file' => $exception instanceof Throwable ? $exception->getFile() : null,
            'line' => $exception instanceof Throwable ? $exception->getLine() : null,
            'trace' => $exception instanceof Throwable ? $exception->getTraceAsString() : null,
            'context' => $this->sanitizeContext($context),
        ]);
    }

    private function record(array $payload): void
    {
        if (self::$recording) {
            return;
        }

        self::$recording = true;

        try {
            $request = app()->bound('request') ? request() : null;
            $payload = array_merge($payload, $this->requestPayload($request));
            $shouldNotify = $this->shouldSendTelegramNotification($payload);

            ErrorLog::create($payload);

            if ($shouldNotify) {
                $sent = app(TelegramService::class)->sendErrorMessage($this->telegramMessage($payload));

                if (! $sent) {
                    Cache::forget($this->telegramNotificationCacheKey($payload));
                }
            }
        } catch (Throwable) {
            //
        } finally {
            self::$recording = false;
        }
    }

    private function requestPayload(?Request $request): array
    {
        if (! $request) {
            return [];
        }

        $user = $request->user();

        return [
            'request_method' => $request->method(),
            'request_url' => $request->fullUrl(),
            'route_name' => $request->route()?->getName(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'user_id' => $user?->id,
            'company_id' => $user?->current_company_id,
        ];
    }

    private function sanitizeContext(array $context): array
    {
        return collect($context)
            ->reject(fn ($value, $key) => $key === 'exception' || $value instanceof Throwable)
            ->map(fn ($value) => $this->normalizeContextValue($value))
            ->all();
    }

    private function normalizeContextValue(mixed $value): mixed
    {
        if (is_scalar($value) || is_null($value)) {
            return $value;
        }

        if (is_array($value)) {
            return collect($value)
                ->reject(fn ($item) => $item instanceof Throwable)
                ->map(fn ($item) => $this->normalizeContextValue($item))
                ->all();
        }

        return method_exists($value, '__toString') ? (string) $value : $value::class;
    }

    private function shouldSendTelegramNotification(array $payload): bool
    {
        if (($payload['level'] ?? null) !== 'CRITICAL') {
            return false;
        }

        return Cache::add(
            $this->telegramNotificationCacheKey($payload),
            true,
            now()->addDay()
        );
    }

    private function telegramNotificationCacheKey(array $payload): string
    {
        return 'telegram-critical-error:'.$this->errorFingerprint($payload);
    }

    private function errorFingerprint(array $payload): string
    {
        return sha1(json_encode([
            'level' => $payload['level'] ?? null,
            'message' => $payload['message'] ?? null,
            'exception_class' => $payload['exception_class'] ?? null,
            'file' => $payload['file'] ?? null,
            'line' => $payload['line'] ?? null,
        ]));
    }

    private function telegramMessage(array $payload): string
    {
        $lines = [
            '<b>Critical Error</b>',
            '<b>App:</b> '.$this->escape(config('app.name', 'Laravel')),
            '<b>Message:</b> '.$this->escape($payload['message'] ?? '-'),
        ];

        if (! blank($payload['exception_class'] ?? null)) {
            $lines[] = '<b>Exception:</b> '.$this->escape($payload['exception_class']);
        }

        if (! blank($payload['file'] ?? null)) {
            $location = $payload['file'];

            if (! blank($payload['line'] ?? null)) {
                $location .= ':'.$payload['line'];
            }

            $lines[] = '<b>Location:</b> '.$this->escape($location);
        }

        if (! blank($payload['request_method'] ?? null) || ! blank($payload['request_url'] ?? null)) {
            $lines[] = '<b>Request:</b> '.$this->escape(trim(($payload['request_method'] ?? '').' '.($payload['request_url'] ?? '')));
        }

        if (! blank($payload['route_name'] ?? null)) {
            $lines[] = '<b>Route:</b> '.$this->escape($payload['route_name']);
        }

        if (! blank($payload['user_id'] ?? null)) {
            $lines[] = '<b>User ID:</b> '.$this->escape((string) $payload['user_id']);
        }

        if (! blank($payload['company_id'] ?? null)) {
            $lines[] = '<b>Company ID:</b> '.$this->escape((string) $payload['company_id']);
        }

        return implode("\n", $lines);
    }

    private function escape(mixed $value): string
    {
        return e((string) $value);
    }
}
