<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Models\CashBankAccount;
use App\Models\CompanyUser;
use App\Models\OnboardingState;
use App\Models\Transaction;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContextController extends Controller
{
    public function bootstrap(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request),
            'company' => $this->companyPayload($request),
            'permissions' => $this->permissionsPayload($request),
            'permission_groups' => Permissions::groups(),
            'onboarding' => $this->onboardingPayload($request),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request),
        ]);
    }

    public function company(Request $request): JsonResponse
    {
        return response()->json([
            'company' => $this->companyPayload($request),
        ]);
    }

    public function permissions(Request $request): JsonResponse
    {
        return response()->json([
            'permissions' => $this->permissionsPayload($request),
            'groups' => Permissions::groups(),
        ]);
    }

    protected function userPayload(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'current_company_id' => $user->current_company_id,
            'is_owner' => $user->isOwnerOf(),
        ];
    }

    protected function companyPayload(Request $request): ?array
    {
        $company = $request->user()->currentCompany;

        if (! $company) {
            return null;
        }

        return [
            'id' => $company->id,
            'name' => $company->name,
            'legal_name' => $company->legal_name,
            'tax_id' => $company->tax_id,
            'address' => $company->address,
            'phone' => $company->phone,
            'email' => $company->email,
            'currency' => $company->currency,
            'timezone' => $company->timezone,
            'fiscal_year_start' => $company->fiscal_year_start,
            'enabled_menus' => $company->enabledMenus(),
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function permissionsPayload(Request $request): array
    {
        $user = $request->user();

        if (! $user->current_company_id) {
            return [];
        }

        $membership = CompanyUser::with('role:id,permissions')
            ->where('company_id', $user->current_company_id)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        return $membership?->role?->permissions ?? [];
    }

    protected function onboardingPayload(Request $request): array
    {
        $user = $request->user();
        $companyId = $user->current_company_id;

        $state = OnboardingState::where('user_id', $user->id)
            ->where('company_id', $companyId)
            ->first();

        $hasCashBank = CashBankAccount::where('company_id', $companyId)->exists();
        $hasTransaction = Transaction::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->exists();
        $isComplete = $hasCashBank && $hasTransaction;
        $isSkipped = $state?->skipped_at !== null;
        $isCompletedDismissed = $state?->completed_dismissed_at !== null;

        return [
            'has_cash_bank' => $hasCashBank,
            'has_transaction' => $hasTransaction,
            'is_skipped' => $isSkipped,
            'is_complete' => $isComplete,
            'is_completed_dismissed' => $isCompletedDismissed,
            'should_show' => ! $isSkipped && (! $isComplete || ! $isCompletedDismissed),
        ];
    }
}
