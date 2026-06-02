<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DevFeedbackController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $feedback = Feedback::query()
            ->with([
                'user:id,name,email',
                'company:id,name,email',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('message', 'like', "%{$search}%")
                        ->orWhere('page_url', 'like', "%{$search}%")
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
            ->through(fn (Feedback $feedback) => [
                'id' => $feedback->id,
                'message' => $feedback->message,
                'page_url' => $feedback->page_url,
                'user_agent' => $feedback->user_agent,
                'created_at' => $feedback->created_at?->format('Y-m-d H:i'),
                'user' => $feedback->user ? [
                    'name' => $feedback->user->name,
                    'email' => $feedback->user->email,
                ] : null,
                'company' => $feedback->company ? [
                    'name' => $feedback->company->name,
                    'email' => $feedback->company->email,
                ] : null,
            ]);

        return Inertia::render('Dev/Feedback/Index', [
            'feedback' => $feedback,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }
}
