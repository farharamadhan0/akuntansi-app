<?php

namespace App\Http\Controllers;

use App\Models\OnboardingState;
use Illuminate\Http\RedirectResponse;

class OnboardingController extends Controller
{
    public function skip(): RedirectResponse
    {
        OnboardingState::updateOrCreate(
            [
                'user_id' => auth()->id(),
                'company_id' => auth()->user()->current_company_id,
            ],
            [
                'skipped_at' => now(),
            ]
        );

        return back();
    }

    public function dismissCompleted(): RedirectResponse
    {
        OnboardingState::updateOrCreate(
            [
                'user_id' => auth()->id(),
                'company_id' => auth()->user()->current_company_id,
            ],
            [
                'completed_dismissed_at' => now(),
            ]
        );

        return back();
    }
}
