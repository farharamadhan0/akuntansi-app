<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Receivable;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\ReceivableService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceivablePaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Customer $customer;
    private CashBankAccount $cashBank;
    private Receivable $receivable;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Bayar Piutang'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->actingAs($this->user);

        $this->customer = Customer::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'PT Klien Utama',
            'is_active'  => true,
        ]);

        $this->cashBank = $this->createDefaultCashBankAccount($this->companyId);

        // Create a posted receivable ready to be paid
        $service = app(ReceivableService::class);
        $receivable = $service->create([
            'company_id'  => $this->companyId,
            'customer_id' => $this->customer->id,
            'date'        => now()->format('Y-m-d'),
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => 1500000,
            'description' => 'Invoice tagihan',
        ]);
        $this->receivable = $service->post($receivable);
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_payment_list_page_loads(): void
    {
        $this->get('/transaksi/piutang-bayar')->assertOk();
    }

    public function test_payment_create_page_loads(): void
    {
        $this->get('/transaksi/piutang-bayar/catat')->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        auth()->logout();
        $this->get('/transaksi/piutang-bayar')->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Full payment
    // -----------------------------------------------------------------------

    public function test_full_payment_sets_receivable_to_paid(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]))->assertSessionHas('success');

        $this->assertDatabaseHas('receivables', [
            'id'             => $this->receivable->id,
            'paid_amount'    => 1500000,
            'payment_status' => PaymentStatus::Paid->value,
        ]);
    }

    public function test_full_payment_creates_payment_record(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        $this->assertDatabaseHas('payments', [
            'company_id'          => $this->companyId,
            'customer_id'         => $this->customer->id,
            'amount'              => 1500000,
            'status'              => TransactionStatus::Posted->value,
            'cash_bank_account_id' => $this->cashBank->id,
        ]);
    }

    public function test_full_payment_creates_allocation_record(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->assertDatabaseHas('payment_allocations', [
            'payment_id'      => $payment->id,
            'allocatable_type' => Receivable::class,
            'allocatable_id'  => $this->receivable->id,
            'amount'          => 1500000,
        ]);
    }

    // -----------------------------------------------------------------------
    // Partial payment
    // -----------------------------------------------------------------------

    public function test_partial_payment_sets_receivable_to_partial(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 500000]],
        ]));

        $this->assertDatabaseHas('receivables', [
            'id'             => $this->receivable->id,
            'paid_amount'    => 500000,
            'payment_status' => PaymentStatus::Partial->value,
        ]);
    }

    public function test_partial_payment_updates_remaining_amount(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 600000]],
        ]));

        $receivable = $this->receivable->fresh();
        $this->assertEquals(900000, (float) $receivable->remaining_amount);
    }

    // -----------------------------------------------------------------------
    // Journal
    // -----------------------------------------------------------------------

    public function test_payment_creates_balanced_journal_entry(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        // 2 entries: 1 from receivable creation, 1 from payment
        $paymentEntry = JournalEntry::withoutGlobalScope('company')
            ->where('source_type', Payment::class)
            ->where('source_id', $payment->id)
            ->with('lines')
            ->firstOrFail();

        $this->assertTrue($paymentEntry->isBalanced());
        $this->assertEquals(1500000, $paymentEntry->lines->sum('debit'));
        $this->assertEquals(1500000, $paymentEntry->lines->sum('credit'));
    }

    public function test_payment_debit_targets_cash_bank_account(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry     = $payment->journalEntries()->with('lines.account')->first();
        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);

        $this->assertNotNull($debitLine);
        $this->assertEquals($this->cashBank->account_id, $debitLine->account_id);
    }

    public function test_payment_credit_targets_receivable_account(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry      = $payment->journalEntries()->with('lines.account')->first();
        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);

        $this->assertNotNull($creditLine);
        $this->assertEquals('receivable', $creditLine->account->subtype);
    }

    // -----------------------------------------------------------------------
    // Void payment
    // -----------------------------------------------------------------------

    public function test_void_payment_reverses_paid_amount(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->post("/transaksi/piutang-bayar/{$payment->id}/batal", [
            'reason' => 'Pembatalan test',
        ])->assertSessionHas('success');

        $this->assertDatabaseHas('receivables', [
            'id'             => $this->receivable->id,
            'paid_amount'    => 0,
            'payment_status' => PaymentStatus::Unpaid->value,
        ]);
    }

    public function test_void_payment_sets_payment_status_to_voided(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->post("/transaksi/piutang-bayar/{$payment->id}/batal", [
            'reason' => 'Pembatalan test',
        ]);

        $this->assertDatabaseHas('payments', [
            'id'          => $payment->id,
            'status'      => TransactionStatus::Voided->value,
            'void_reason' => 'Pembatalan test',
        ]);
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_required_fields_are_validated(): void
    {
        $this->post('/transaksi/piutang-bayar', [])
            ->assertSessionHasErrors(['date', 'cash_bank_account_id', 'allocations']);
    }

    public function test_payment_exceeding_remaining_amount_is_rejected(): void
    {
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 9999999]],
        ]))->assertSessionHasErrors();

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_already_paid_receivable_cannot_be_paid_again(): void
    {
        // Pay in full first
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]));

        // Attempt a second payment
        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->receivable->id, 'amount' => 100000]],
        ]))->assertSessionHasErrors();

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_cash_bank_from_other_company_is_rejected(): void
    {
        $otherCashBank = $this->createOtherCompanyCashBank();

        $this->post('/transaksi/piutang-bayar', $this->validPayload([
            'cash_bank_account_id' => $otherCashBank->id,
            'allocations'          => [['id' => $this->receivable->id, 'amount' => 1500000]],
        ]))->assertSessionHasErrors('cash_bank_account_id');

        $this->assertDatabaseCount('payments', 0);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'date'                 => now()->format('Y-m-d'),
            'cash_bank_account_id' => $this->cashBank->id,
            'description'          => 'Penerimaan pembayaran',
            'reference'            => 'PAY-TEST-001',
            'allocations'          => [
                ['id' => $this->receivable->id, 'amount' => 1500000],
            ],
        ], $overrides);
    }

    private function createOtherCompanyCashBank(): CashBankAccount
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Bayar'],
            $otherUser
        );

        return $this->createDefaultCashBankAccount($otherCompany->id);
    }
}
