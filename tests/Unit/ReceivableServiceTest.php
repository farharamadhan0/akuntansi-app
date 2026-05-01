<?php

namespace Tests\Unit;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\Receivable;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\ReceivableService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceivableServiceTest extends TestCase
{
    use RefreshDatabase;

    private ReceivableService $service;
    private User $user;
    private int $companyId;
    private Customer $customer;
    private TransactionCategory $category;
    private Account $receivableAccount;
    private Account $revenueAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(ReceivableService::class);
        $this->user    = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Unit Test Piutang'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->customer = Customer::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Pelanggan Unit Test',
            'is_active'  => true,
        ]);

        $this->category = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'income')
            ->first();

        $this->receivableAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'receivable')
            ->first();

        $this->revenueAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'operating_revenue')
            ->first();

        $this->actingAs($this->user);
    }

    // -----------------------------------------------------------------------
    // create()
    // -----------------------------------------------------------------------

    public function test_create_returns_draft_receivable(): void
    {
        $receivable = $this->service->create($this->payload());

        $this->assertInstanceOf(Receivable::class, $receivable);
        $this->assertEquals(TransactionStatus::Draft, $receivable->status);
        $this->assertEquals(PaymentStatus::Unpaid, $receivable->payment_status);
        $this->assertEquals(1000000, (float) $receivable->amount);
        $this->assertEquals(0, (float) $receivable->paid_amount);
    }

    public function test_create_assigns_receivable_number(): void
    {
        $receivable = $this->service->create($this->payload());

        $this->assertNotEmpty($receivable->receivable_number);
        $this->assertStringStartsWith('AR-', $receivable->receivable_number);
    }

    public function test_create_does_not_post_journal_entry(): void
    {
        $this->service->create($this->payload());

        $this->assertDatabaseCount('journal_entries', 0);
    }

    public function test_create_links_customer(): void
    {
        $receivable = $this->service->create($this->payload());

        $this->assertEquals($this->customer->id, $receivable->customer_id);
    }

    // -----------------------------------------------------------------------
    // create() — credit limit
    // -----------------------------------------------------------------------

    public function test_create_succeeds_when_customer_has_no_credit_limit(): void
    {
        $this->customer->update(['credit_limit' => null]);

        $receivable = $this->service->create($this->payload(['amount' => 999999999]));

        $this->assertInstanceOf(Receivable::class, $receivable);
    }

    public function test_create_succeeds_when_amount_is_within_credit_limit(): void
    {
        $this->customer->update(['credit_limit' => 2000000]);

        $receivable = $this->service->create($this->payload(['amount' => 2000000]));

        $this->assertInstanceOf(Receivable::class, $receivable);
    }

    public function test_create_throws_when_amount_exceeds_credit_limit(): void
    {
        $this->customer->update(['credit_limit' => 500000]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessageMatches('/limit kredit/i');

        $this->service->create($this->payload(['amount' => 600000]));
    }

    public function test_create_throws_when_outstanding_plus_new_amount_exceeds_credit_limit(): void
    {
        $this->customer->update(['credit_limit' => 1500000]);

        // First receivable: 1.000.000 — still within limit
        $first = $this->service->create($this->payload(['amount' => 1000000]));
        $this->service->post($first);

        // Second receivable: 600.000 — total 1.600.000 > limit 1.500.000
        $this->expectException(\Exception::class);
        $this->expectExceptionMessageMatches('/limit kredit/i');

        $this->service->create($this->payload(['amount' => 600000, 'reference' => 'INV-UNIT-002']));
    }

    // -----------------------------------------------------------------------
    // post()
    // -----------------------------------------------------------------------

    public function test_post_updates_status_to_posted(): void
    {
        $receivable = $this->service->create($this->payload());
        $posted     = $this->service->post($receivable);

        $this->assertEquals(TransactionStatus::Posted, $posted->status);
        $this->assertNotNull($posted->posted_at);
    }

    public function test_post_creates_exactly_one_journal_entry(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $this->assertDatabaseCount('journal_entries', 1);
    }

    public function test_post_creates_exactly_two_journal_lines(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $this->assertDatabaseCount('journal_lines', 2);
    }

    public function test_journal_entry_is_balanced(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->with('lines')
            ->first();

        $this->assertTrue($entry->isBalanced());
        $this->assertEquals(1000000, $entry->lines->sum('debit'));
        $this->assertEquals(1000000, $entry->lines->sum('credit'));
    }

    public function test_debit_line_targets_receivable_account(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $entry     = JournalEntry::withoutGlobalScope('company')->first();
        $debitLine = $entry->lines()->where('debit', '>', 0)->first();

        $this->assertEquals($this->receivableAccount->id, $debitLine->account_id);
        $this->assertEquals(1000000, (float) $debitLine->debit);
        $this->assertEquals(0, (float) $debitLine->credit);
    }

    public function test_credit_line_uses_category_account(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $entry      = JournalEntry::withoutGlobalScope('company')->first();
        $creditLine = $entry->lines()->where('credit', '>', 0)->first();

        $this->assertEquals($this->category->account_id, $creditLine->account_id);
        $this->assertEquals(1000000, (float) $creditLine->credit);
        $this->assertEquals(0, (float) $creditLine->debit);
    }

    public function test_credit_line_falls_back_to_operating_revenue_without_category(): void
    {
        $payload = $this->payload();
        unset($payload['category_id']);

        $receivable = $this->service->create($payload);
        $this->service->post($receivable);

        $entry      = JournalEntry::withoutGlobalScope('company')->with('lines.account')->first();
        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);

        $this->assertEquals($this->revenueAccount->id, $creditLine->account_id);
        $this->assertEquals('operating_revenue', $creditLine->account->subtype);
    }

    public function test_journal_entry_is_linked_to_source_receivable(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $entry = JournalEntry::withoutGlobalScope('company')->first();

        $this->assertEquals(Receivable::class, $entry->source_type);
        $this->assertEquals($receivable->id, $entry->source_id);
    }

    public function test_posting_draft_twice_throws_exception(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Hanya piutang draft yang dapat diposting.');

        $this->service->post($receivable->fresh());
    }

    // -----------------------------------------------------------------------
    // void()
    // -----------------------------------------------------------------------

    public function test_void_updates_status_to_voided(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $voided = $this->service->void($receivable->fresh(), 'Kesalahan input');

        $this->assertEquals(TransactionStatus::Voided, $voided->status);
        $this->assertNotNull($voided->voided_at);
        $this->assertEquals('Kesalahan input', $voided->void_reason);
    }

    public function test_void_reverses_journal_entry(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $this->service->void($receivable->fresh(), 'Batal');

        // Original entry is now voided; a reversal entry is created
        $entries = JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->get();

        $this->assertGreaterThanOrEqual(1, $entries->count());

        $voidedEntry = $entries->first(fn($e) => $e->status === TransactionStatus::Voided);
        $this->assertNotNull($voidedEntry);
    }

    public function test_void_draft_throws_exception(): void
    {
        $receivable = $this->service->create($this->payload());

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Hanya piutang yang sudah diposting yang dapat dibatalkan.');

        $this->service->void($receivable, 'Batal');
    }

    public function test_void_with_paid_amount_throws_exception(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        // Simulate a partial payment
        $receivable->update(['paid_amount' => 100000]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Piutang yang sudah ada pembayaran tidak dapat dibatalkan.');

        $this->service->void($receivable->fresh(), 'Batal');
    }

    // -----------------------------------------------------------------------
    // updatePaymentStatus()
    // -----------------------------------------------------------------------

    public function test_update_payment_status_sets_unpaid_when_zero_paid(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $receivable->update(['paid_amount' => 0]);
        $this->service->updatePaymentStatus($receivable->fresh());

        $this->assertDatabaseHas('receivables', [
            'id'             => $receivable->id,
            'payment_status' => PaymentStatus::Unpaid->value,
        ]);
    }

    public function test_update_payment_status_sets_partial_when_partly_paid(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $receivable->update(['paid_amount' => 400000]);
        $this->service->updatePaymentStatus($receivable->fresh());

        $this->assertDatabaseHas('receivables', [
            'id'             => $receivable->id,
            'payment_status' => PaymentStatus::Partial->value,
        ]);
    }

    public function test_update_payment_status_sets_paid_when_fully_paid(): void
    {
        $receivable = $this->service->create($this->payload());
        $this->service->post($receivable);

        $receivable->update(['paid_amount' => 1000000]);
        $this->service->updatePaymentStatus($receivable->fresh());

        $this->assertDatabaseHas('receivables', [
            'id'             => $receivable->id,
            'payment_status' => PaymentStatus::Paid->value,
        ]);
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'company_id'  => $this->companyId,
            'customer_id' => $this->customer->id,
            'date'        => now()->format('Y-m-d'),
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => 1000000,
            'description' => 'Tagihan jasa konsultasi',
            'category_id' => $this->category->id,
            'reference'   => 'INV-UNIT-001',
        ], $overrides);
    }
}
