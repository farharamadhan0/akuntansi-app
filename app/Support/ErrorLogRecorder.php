<?php

namespace App\Support;

use App\Models\ErrorLog;
use Illuminate\Http\Request;
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

            ErrorLog::create(array_merge($payload, $this->requestPayload($request)));
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
}
