<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_login_cancel_redirects_back_to_login_with_error_message(): void
    {
        $this->get('/auth/google/callback?error=access_denied&state=test-state')
            ->assertRedirect('/login')
            ->assertSessionHas('error', 'Login dengan Google dibatalkan.');
    }

    public function test_invalid_google_state_redirects_back_to_login_with_error_message(): void
    {
        Socialite::shouldReceive('driver->user')
            ->once()
            ->andThrow(new InvalidStateException());

        $this->get('/auth/google/callback?state=test-state')
            ->assertRedirect('/login')
            ->assertSessionHas('error', 'Sesi login Google sudah tidak valid. Silakan coba lagi.');
    }
}
