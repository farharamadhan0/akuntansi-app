<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\CashBankAccount;
use App\Models\JournalEntry;
use App\Models\Payable;
use App\Models\Payment;
use App\Models\Supplier;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\PayableService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayablePaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Supplier $supplier;
    private CashBankAccount $cashBank;
    private Payable $payable;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Bayar Hutang'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->actingAs($this->user);

        $this->supplier = Supplier::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'PT Vendor Utama',
            'is_active'  => true,
        ]);

        $this->cashBank = CashBankAccount::where('company_id', $this->companyId)->first();

        $service = app(PayableService::class);
        $payable = $service->create([
            'company_id'  => $this->companyId,
            'supplier_id' => $this->supplier->id,
            'date'        => now()->format('Y-m-d'),
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => 2000000,
            'description' => 'Tagihan pemasok',
        ]);
        $this->payable = $service->post($payable);
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_payment_list_page_loads(): void
    {
        $this->get('/transaksi/hutang-bayar')->assertOk();
    }

    public function test_payment_create_page_loads(): void
    {
        $this->get('/transaksi/hutang-bayar/catat')->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        auth()->logout();
        $this->get('/transaksi/hutang-bayar')->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Full payment
    // -----------------------------------------------------------------------

    public function test_full_payment_sets_payable_to_paid(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]))->assertSessionHas('success');

        $this->assertDatabaseHas('payables', [
            'id'             => $this->payable->id,
            'paid_amount'    => 2000000,
            'payment_status' => PaymentStatus::Paid->value,
        ]);
    }

    public function test_full_payment_creates_payment_record(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $this->assertDatabaseHas('payments', [
            'company_id'           => $this->companyId,
            'supplier_id'          => $this->supplier->id,
            'amount'               => 2000000,
            'status'               => TransactionStatus::Posted->value,
            'cash_bank_account_id' => $this->cashBank->id,
        ]);
    }

    public function test_full_payment_creates_allocation_record(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->assertDatabaseHas('payment_allocations', [
            'payment_id'       => $payment->id,
            'allocatable_type' => Payable::class,
            'allocatable_id'   => $this->payable->id,
            'amount'           => 2000000,
        ]);
    }

    // -----------------------------------------------------------------------
    // Partial payment
    // -----------------------------------------------------------------------

    public function test_partial_payment_sets_payable_to_partial(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 800000]],
        ]));

        $this->assertDatabaseHas('payables', [
            'id'             => $this->payable->id,
            'paid_amount'    => 800000,
            'payment_status' => PaymentStatus::Partial->value,
        ]);
    }

    public function test_partial_payment_updates_remaining_amount(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 700000]],
        ]));

        $payable = $this->payable->fresh();
        $this->assertEquals(1300000, (float) $payable->remaining_amount);
    }

    // -----------------------------------------------------------------------
    // Journal
    // -----------------------------------------------------------------------

    public function test_payment_creates_balanced_journal_entry(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $paymentEntry = JournalEntry::withoutGlobalScope('company')
            ->where('source_type', Payment::class)
            ->where('source_id', $payment->id)
            ->with('lines')
            ->firstOrFail();

        $this->assertTrue($paymentEntry->isBalanced());
        $this->assertEquals(2000000, $paymentEntry->lines->sum('debit'));
        $this->assertEquals(2000000, $paymentEntry->lines->sum('credit'));
    }

    public function test_payment_debit_targets_payable_account(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry     = $payment->journalEntries()->with('lines.account')->first();
        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);

        $this->assertNotNull($debitLine);
        $this->assertEquals('payable', $debitLine->account->subtype);
    }

    public function test_payment_credit_targets_cash_bank_account(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry      = $payment->journalEntries()->with('lines.account')->first();
        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);

        $this->assertNotNull($creditLine);
        $this->assertEquals($this->cashBank->account_id, $creditLine->account_id);
    }

    // -----------------------------------------------------------------------
    // Void payment
    // -----------------------------------------------------------------------

    public function test_void_payment_reverses_paid_amount(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->post("/transaksi/hutang-bayar/{$payment->id}/batal", [
            'reason' => 'Pembatalan test',
        ])->assertSessionHas('success');

        $this->assertDatabaseHas('payables', [
            'id'             => $this->payable->id,
            'paid_amount'    => 0,
            'payment_status' => PaymentStatus::Unpaid->value,
        ]);
    }

    public function test_void_payment_sets_payment_status_to_voided(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $payment = Payment::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->post("/transaksi/hutang-bayar/{$payment->id}/batal", [
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
        $this->post('/transaksi/hutang-bayar', [])
            ->assertSessionHasErrors(['date', 'cash_bank_account_id', 'allocations']);
    }

    public function test_payment_exceeding_remaining_amount_is_rejected(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 9999999]],
        ]))->assertSessionHasErrors();

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_already_paid_payable_cannot_be_paid_again(): void
    {
        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 2000000]],
        ]));

        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'allocations' => [['id' => $this->payable->id, 'amount' => 100000]],
        ]))->assertSessionHasErrors();

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_cash_bank_from_other_company_is_rejected(): void
    {
        $otherCashBank = $this->createOtherCompanyCashBank();

        $this->post('/transaksi/hutang-bayar', $this->validPayload([
            'cash_bank_account_id' => $otherCashBank->id,
            'allocations'          => [['id' => $this->payable->id, 'amount' => 2000000]],
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
            'description'          => 'Pembayaran hutang test',
            'reference'            => 'PAY-TEST-001',
            'allocations'          => [
                ['id' => $this->payable->id, 'amount' => 2000000],
            ],
        ], $overrides);
    }

    private function createOtherCompanyCashBank(): CashBankAccount
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Bayar Hutang'],
            $otherUser
        );

        return CashBankAccount::withoutGlobalScope('company')
            ->where('company_id', $otherCompany->id)
            ->firstOrFail();
    }
}
