<?php

namespace Tests\Unit;

use App\Enums\AccountType;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\GeneralLedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeneralLedgerServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Account $cashAccount;
    private Account $revenueAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Ledger Test'],
            $this->user,
        );

        $this->companyId = $company->id;
        $this->cashAccount = Account::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('subtype', 'cash')
            ->firstOrFail();
        $this->revenueAccount = Account::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('type', AccountType::Revenue)
            ->firstOrFail();
    }

    public function test_voided_entries_and_reversals_are_display_only_for_running_balance(): void
    {
        $this->createEntry('JE-001', '2026-04-30', TransactionStatus::Posted, 100000, 0);
        $this->createEntry('JE-002', '2026-04-30', TransactionStatus::Voided, 999000, 0);
        $this->createEntry('JE-003', '2026-04-30', TransactionStatus::Posted, 0, 999000, true, 'Pembalikan: JE-002');
        $this->createEntry('JE-004', '2026-05-01', TransactionStatus::Posted, 50000, 0);
        $this->createEntry('JE-005', '2026-05-02', TransactionStatus::Voided, 30000, 0);
        $this->createEntry('JE-006', '2026-05-02', TransactionStatus::Posted, 10000, 0);
        $this->createEntry('JE-007', '2026-05-02', TransactionStatus::Posted, 0, 30000, true, 'Pembalikan: JE-005');
        $this->createEntry('JE-008', '2026-05-03', TransactionStatus::Posted, 0, 20000);

        $service = app(GeneralLedgerService::class);

        $withoutVoided = $service->getLedger($this->companyId, $this->cashAccount->id, '2026-05-01', '2026-05-31');
        $withVoided = $service->getLedger($this->companyId, $this->cashAccount->id, '2026-05-01', '2026-05-31', true);

        $this->assertSame(100000.0, $withoutVoided['opening_balance']);
        $this->assertSame($withoutVoided['opening_balance'], $withVoided['opening_balance']);
        $this->assertSame($withoutVoided['total_debit'], $withVoided['total_debit']);
        $this->assertSame($withoutVoided['total_credit'], $withVoided['total_credit']);
        $this->assertSame($withoutVoided['closing_balance'], $withVoided['closing_balance']);

        $this->assertSame([150000.0, 160000.0, 140000.0], array_column($withoutVoided['lines'], 'running_balance'));
        $this->assertSame([150000.0, 150000.0, 150000.0, 160000.0, 140000.0], array_column($withVoided['lines'], 'running_balance'));
        $this->assertSame(['JE-004', 'JE-005', 'JE-007', 'JE-006', 'JE-008'], array_column($withVoided['lines'], 'entry_number'));
        $this->assertSame(TransactionStatus::Voided->value, $withVoided['lines'][1]['status']);
        $this->assertSame('Pembalikan: JE-005', $withVoided['lines'][2]['description']);
    }

    private function createEntry(
        string $entryNumber,
        string $date,
        TransactionStatus $status,
        float $cashDebit,
        float $cashCredit,
        bool $isAdjusting = false,
        ?string $description = null,
    ): void {
        $entry = JournalEntry::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'entry_number' => $entryNumber,
            'date' => $date,
            'description' => $description ?? $entryNumber,
            'is_manual' => ! $isAdjusting,
            'is_adjusting' => $isAdjusting,
            'status' => $status,
            'created_by' => $this->user->id,
        ]);

        $entry->lines()->create([
            'account_id' => $this->cashAccount->id,
            'debit' => $cashDebit,
            'credit' => $cashCredit,
        ]);

        $entry->lines()->create([
            'account_id' => $this->revenueAccount->id,
            'debit' => $cashCredit,
            'credit' => $cashDebit,
        ]);
    }
}
