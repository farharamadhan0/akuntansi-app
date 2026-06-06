<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Models\FeedbackMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;

class FeedbackController extends Controller
{
    public function pageIndex(Request $request): Response
    {
        $status = (string) $request->query('status', '');

        $tickets = Feedback::query()
            ->withCount('messages')
            ->where('user_id', $request->user()->id)
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Feedback $feedback) => [
                'id' => $feedback->id,
                'category' => $feedback->category,
                'status' => $feedback->status,
                'message' => $feedback->message,
                'image_url' => $feedback->image_path ? route('feedback.attachment', $feedback) : null,
                'created_at' => $feedback->created_at?->format('Y-m-d H:i'),
                'messages_count' => $feedback->messages_count,
            ]);

        return Inertia::render('Feedback/Index', [
            'tickets' => $tickets,
            'filters' => [
                'status' => $status,
            ],
        ]);
    }

    public function show(Request $request, Feedback $feedback): Response
    {
        abort_unless($feedback->user_id === $request->user()->id, 403);

        $feedback->load([
            'user:id,name,email',
            'messages.user:id,name,email',
        ]);

        return Inertia::render('Feedback/Show', [
            'ticket' => $this->ticketPayload($feedback),
        ]);
    }

    public function attachment(Request $request, Feedback $feedback): StreamedResponse
    {
        abort_unless($feedback->user_id === $request->user()->id, 403);
        abort_if(blank($feedback->image_path), 404);
        abort_unless(Storage::disk('public')->exists($feedback->image_path), 404);

        return Storage::disk('public')->response($feedback->image_path);
    }

    public function index(Request $request): JsonResponse
    {
        $tickets = Feedback::query()
            ->with([
                'user:id,name,email',
                'messages.user:id,name,email',
            ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (Feedback $feedback) => $this->ticketPayload($feedback));

        return response()->json([
            'tickets' => $tickets,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'in:error,data_mismatch,feature_request,question'],
            'message' => ['required', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $imagePath = $request->file('image')?->store('feedback', 'public');

        $feedback = Feedback::create([
            'user_id' => $request->user()->id,
            'company_id' => $request->user()->current_company_id,
            'category' => $data['category'],
            'message' => $data['message'],
            'status' => 'open',
            'image_path' => $imagePath,
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ]);

        return redirect()
            ->route('feedback.show', $feedback)
            ->with('success', 'Ticket kamu sudah terkirim. Tim dev akan menindaklanjuti.');
    }

    public function reply(Request $request, Feedback $feedback): RedirectResponse
    {
        abort_unless($feedback->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $lastMessage = $feedback->messages()->latest()->first();

        if ($lastMessage?->sender_type !== 'developer') {
            return back()->withErrors([
                'message' => 'Kamu bisa membalas setelah dev menanggapi.',
            ]);
        }

        $feedback->messages()->create([
            'user_id' => $request->user()->id,
            'sender_type' => 'user',
            'message' => $data['message'],
        ]);

        return back()->with('success', 'Balasan kamu berhasil dikirim.');
    }

    private function ticketPayload(Feedback $feedback): array
    {
        $messages = $feedback->messages
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
            ]);

        $lastMessage = $messages->last();

        return [
            'id' => $feedback->id,
            'category' => $feedback->category,
            'status' => $feedback->status,
            'message' => $feedback->message,
            'image_url' => $feedback->image_path ? route('feedback.attachment', $feedback) : null,
            'created_at' => $feedback->created_at?->format('Y-m-d H:i'),
            'can_reply' => ($lastMessage['sender_type'] ?? null) === 'developer',
            'messages' => $messages,
        ];
    }
}
