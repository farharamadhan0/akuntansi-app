<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DevFeedbackController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', '');

        $feedback = Feedback::query()
            ->with([
                'user:id,name,email',
                'company:id,name,email',
                'responder:id,name,email',
            ])
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('message', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
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
                'category' => $feedback->category,
                'status' => $feedback->status,
                'message' => $feedback->message,
                'image_url' => $feedback->image_path ? asset('storage/'.$feedback->image_path) : null,
                'user_agent' => $feedback->user_agent,
                'developer_response' => $feedback->developer_response,
                'created_at' => $feedback->created_at?->format('Y-m-d H:i'),
                'responded_at' => $feedback->responded_at?->format('Y-m-d H:i'),
                'user' => $feedback->user ? [
                    'name' => $feedback->user->name,
                    'email' => $feedback->user->email,
                ] : null,
                'company' => $feedback->company ? [
                    'name' => $feedback->company->name,
                    'email' => $feedback->company->email,
                ] : null,
                'responder' => $feedback->responder ? [
                    'name' => $feedback->responder->name,
                    'email' => $feedback->responder->email,
                ] : null,
            ]);

        return Inertia::render('Dev/Feedback/Index', [
            'feedback' => $feedback,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    public function update(Request $request, Feedback $feedback): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'developer_response' => ['nullable', 'string', 'max:3000'],
        ]);

        $responseChanged = ($data['developer_response'] ?? null) !== $feedback->developer_response;

        $feedback->fill([
            'status' => $data['status'],
            'developer_response' => $data['developer_response'] ?? null,
        ]);

        if ($responseChanged && filled($data['developer_response'] ?? null)) {
            $feedback->responded_by = $request->user()->id;
            $feedback->responded_at = now();
        }

        $feedback->save();

        return back()->with('success', 'Ticket berhasil diperbarui.');
    }
}
