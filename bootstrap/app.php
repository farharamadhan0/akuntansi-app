<?php

use App\Support\ErrorLogRecorder;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '127.0.0.1');

        $middleware->web(append: [
            \Illuminate\Session\Middleware\AuthenticateSession::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \App\Http\Middleware\TrackPageView::class,
        ]);

        $middleware->alias([
            'has.company' => \App\Http\Middleware\EnsureHasCompany::class,
            'is.owner' => \App\Http\Middleware\EnsureIsOwner::class,
            'is.dev' => \App\Http\Middleware\EnsureDeveloper::class,
            'permission' => \App\Http\Middleware\EnsurePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->reportable(function (\Throwable $throwable): void {
            app(ErrorLogRecorder::class)->recordThrowable($throwable);
        });
    })->create();
