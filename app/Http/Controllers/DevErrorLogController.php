<?php

namespace App\Http\Controllers;

use App\Models\ErrorLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DevErrorLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $level = (string) $request->query('level', '');

        $errorLogs = ErrorLog::query()
            ->with([
                'user:id,name,email',
                'company:id,name,email',
            ])
            ->when($level !== '', fn ($query) => $query->where('level', $level))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('message', 'like', "%{$search}%")
                        ->orWhere('exception_class', 'like', "%{$search}%")
                        ->orWhere('file', 'like', "%{$search}%")
                        ->orWhere('request_url', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        })
                        ->orWhereHas('company', function ($companyQuery) use ($search) {
                            $companyQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ErrorLog $errorLog) => [
                'id' => $errorLog->id,
                'level' => $errorLog->level,
                'message' => $errorLog->message,
                'exception_class' => $errorLog->exception_class,
                'file' => $errorLog->file,
                'line' => $errorLog->line,
                'trace' => $errorLog->trace,
                'context' => $errorLog->context,
                'request_method' => $errorLog->request_method,
                'request_url' => $errorLog->request_url,
                'route_name' => $errorLog->route_name,
                'ip_address' => $errorLog->ip_address,
                'user_agent' => $errorLog->user_agent,
                'created_at' => $errorLog->created_at?->format('Y-m-d H:i:s'),
                'user' => $errorLog->user ? [
                    'name' => $errorLog->user->name,
                    'email' => $errorLog->user->email,
                ] : null,
                'company' => $errorLog->company ? [
                    'name' => $errorLog->company->name,
                    'email' => $errorLog->company->email,
                ] : null,
            ]);

        return Inertia::render('Dev/ErrorLogs/Index', [
            'errorLogs' => $errorLogs,
            'filters' => [
                'search' => $search,
                'level' => $level,
            ],
        ]);
    }
}
