<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FeedbackController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'page_url' => ['nullable', 'string', 'max:255'],
        ]);

        Feedback::create([
            'user_id' => $request->user()->id,
            'company_id' => $request->user()->current_company_id,
            'message' => $data['message'],
            'page_url' => $data['page_url'] ?? null,
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ]);

        return back()->with('success', 'Terima kasih, feedback kamu sudah terkirim.');
    }
}
