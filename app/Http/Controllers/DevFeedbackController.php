<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Models\FeedbackMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
                'messages.user:id,name,email',
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
                'image_url' => $feedback->image_path ? route('dev.feedback.attachment', $feedback) : null,
                'user_agent' => $feedback->user_agent,
                'created_at' => $feedback->created_at?->format('Y-m-d H:i'),
                'messages' => $feedback->messages
                    ->sortBy('created_at')
                    ->values()
                    ->map(fn (FeedbackMessage $message) => [
                        'id' => $message->id,
                        'sender_type' => $message->sender_type,
                        'message' => $message->message,
                        'created_at' => $message->created_at?->format('Y-m-d H:i'),
                        'user' => $message->user ? [
                            'name' => $message->user->name,
                            'email' => $message->user->email,
                        ] : null,
                    ]),
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
        ]);

        $feedback->fill([
            'status' => $data['status'],
        ]);

        $feedback->save();

        return back()->with('success', 'Status ticket berhasil diperbarui.');
    }

    public function attachment(Feedback $feedback): StreamedResponse
    {
        abort_if(blank($feedback->image_path), 404);
        abort_unless(Storage::disk('public')->exists($feedback->image_path), 404);

        return Storage::disk('public')->response($feedback->image_path);
    }

    public function reply(Request $request, Feedback $feedback): RedirectResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $feedback->messages()->create([
            'user_id' => $request->user()->id,
            'sender_type' => 'developer',
            'message' => $data['message'],
        ]);

        $feedback->forceFill([
            'responded_by' => $request->user()->id,
            'responded_at' => now(),
        ])->save();

        return back()->with('success', 'Balasan dev berhasil dikirim.');
    }
}
