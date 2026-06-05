<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tickets = Feedback::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (Feedback $feedback) => [
                'id' => $feedback->id,
                'category' => $feedback->category,
                'status' => $feedback->status,
                'message' => $feedback->message,
                'image_url' => $feedback->image_path ? asset('storage/'.$feedback->image_path) : null,
                'developer_response' => $feedback->developer_response,
                'created_at' => $feedback->created_at?->format('Y-m-d H:i'),
                'responded_at' => $feedback->responded_at?->format('Y-m-d H:i'),
            ]);

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

        Feedback::create([
            'user_id' => $request->user()->id,
            'company_id' => $request->user()->current_company_id,
            'category' => $data['category'],
            'message' => $data['message'],
            'status' => 'open',
            'image_path' => $imagePath,
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ]);

        return back()->with('success', 'Ticket kamu sudah terkirim. Tim dev akan menindaklanjuti.');
    }
}
