<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $this->ensureIsNotRateLimited($request);

        $user = User::where('email', $request->string('email')->toString())->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            RateLimiter::hit($this->throttleKey($request));

            throw ValidationException::withMessages([
                'email' => 'Email atau password salah.',
            ]);
        }

        RateLimiter::clear($this->throttleKey($request));

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email belum diverifikasi.',
                'code' => 'email_not_verified',
            ], 403);
        }

        $user->tokens()->delete();

        $token = $user->createToken(
            $request->string('device_name')->trim()->toString() ?: 'mobile',
            ['*']
        );

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $token->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'current_company_id' => $user->current_company_id,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Berhasil logout.',
        ]);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Semua sesi API berhasil logout.',
        ]);
    }

    protected function ensureIsNotRateLimited(Request $request): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey($request), 5)) {
            return;
        }

        event(new Lockout($request));

        $seconds = RateLimiter::availableIn($this->throttleKey($request));

        throw ValidationException::withMessages([
            'email' => "Terlalu banyak percobaan login. Silakan coba lagi dalam {$seconds} detik.",
        ]);
    }

    protected function throttleKey(Request $request): string
    {
        return Str::transliterate(Str::lower($request->string('email')->toString()).'|'.$request->ip());
    }
}
