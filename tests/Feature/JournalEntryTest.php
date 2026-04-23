<?php

namespace Tests\Feature;

use App\Enums\AccountType;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Account $cashAccount;
    private Account $revenueAccount;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Jurnal Test'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->cashAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'cash')
            ->first();

        $this->revenueAccount = Account::where('company_id', $this->companyId)
            ->where('type', AccountType::Revenue)
            ->first();

        $this->expenseAccount = Account::where('company_id', $this->companyId)
            ->where('type', AccountType::Expense)
            ->first();
    }

    // -----------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------

    public function test_index_page_loads(): void
    {
        $this->actingAs($this->user)->get('/jurnal')->assertOk();
    }

    public function test_create_page_loads(): void
    {
        $this->actingAs($this->user)->get('/jurnal/buat')->assertOk();
    }

    public function test_unauthenticated_user_redirected(): void
    {
        $this->get('/jurnal')->assertRedirect('/login');
    }

    // -----------------------------------------------------------------
    // Store
    // -----------------------------------------------------------------

    public function test_valid_journal_is_stored_as_draft(): void
    {
        $this->actingAs($this->user)
            ->post('/jurnal', $this->balancedPayload())
            ->assertRedirect()
            ->assertSessionHas('success');

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->first();

        $this->assertNotNull($entry);
        $this->assertEquals(TransactionStatus::Draft, $entry->status);
        $this->assertTrue($entry->is_manual);
        $this->assertCount(2, $entry->lines);
        $this->assertEquals(100000, $entry->total_debit);
        $this->assertEquals(100000, $entry->total_credit);
    }

    public function test_unbalanced_journal_is_rejected(): void
    {
        $payload = $this->balancedPayload([
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 100000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 50000],
            ],
        ]);

        $this->actingAs($this->user)
            ->post('/jurnal', $payload)
            ->assertSessionHasErrors('lines');

        $this->assertDatabaseCount('journal_entries', 0);
    }

    public function test_line_with_both_debit_and_credit_is_rejected(): void
    {
        $payload = $this->balancedPayload([
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 100000, 'credit' => 100000],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 100000],
                ['account_id' => $this->expenseAccount->id, 'debit' => 100000, 'credit' => 0],
            ],
        ]);

        $this->actingAs($this->user)
            ->post('/jurnal', $payload)
            ->assertSessionHasErrors();
    }

    public function test_less_than_two_lines_is_rejected(): void
    {
        $payload = $this->balancedPayload([
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 100000, 'credit' => 0],
            ],
        ]);

        $this->actingAs($this->user)
            ->post('/jurnal', $payload)
            ->assertSessionHasErrors('lines');
    }

    public function test_account_from_other_company_is_rejected(): void
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing'],
            $otherUser
        );
        $foreignAccount = Account::withoutGlobalScope('company')
            ->where('company_id', $otherCompany->id)
            ->first();

        $payload = $this->balancedPayload([
            'lines' => [
                ['account_id' => $foreignAccount->id, 'debit' => 100000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 100000],
            ],
        ]);

        $this->actingAs($this->user)
            ->post('/jurnal', $payload)
            ->assertSessionHasErrors('lines.0.account_id');
    }

    // -----------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------

    public function test_draft_can_be_updated(): void
    {
        $entry = $this->createDraftEntry();

        $this->actingAs($this->user)
            ->put("/jurnal/{$entry->id}", $this->balancedPayload([
                'description' => 'Deskripsi baru',
            ]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertEquals('Deskripsi baru', $entry->fresh()->description);
    }

    public function test_posted_cannot_be_updated(): void
    {
        $entry = $this->createDraftEntry();
        $entry->update(['status' => TransactionStatus::Posted]);

        $this->actingAs($this->user)
            ->put("/jurnal/{$entry->id}", $this->balancedPayload())
            ->assertForbidden();
    }

    public function test_auto_journal_cannot_be_updated(): void
    {
        $entry = $this->createDraftEntry();
        $entry->update(['is_manual' => false]);

        $this->actingAs($this->user)
            ->put("/jurnal/{$entry->id}", $this->balancedPayload())
            ->assertForbidden();
    }

    // -----------------------------------------------------------------
    // Post
    // -----------------------------------------------------------------

    public function test_draft_can_be_posted(): void
    {
        $entry = $this->createDraftEntry();

        $this->actingAs($this->user)
            ->post("/jurnal/{$entry->id}/posting")
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertEquals(TransactionStatus::Posted, $entry->fresh()->status);
    }

    public function test_posted_cannot_be_posted_again(): void
    {
        $entry = $this->createDraftEntry();
        $entry->update(['status' => TransactionStatus::Posted]);

        $this->actingAs($this->user)
            ->post("/jurnal/{$entry->id}/posting")
            ->assertSessionHas('error');
    }

    // -----------------------------------------------------------------
    // Void
    // -----------------------------------------------------------------

    public function test_posted_can_be_voided_and_creates_reversal(): void
    {
        $entry = $this->createDraftEntry();
        $entry->update(['status' => TransactionStatus::Posted]);

        $this->actingAs($this->user)
            ->post("/jurnal/{$entry->id}/batal", ['reason' => 'Salah input'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $entry->refresh();
        $this->assertEquals(TransactionStatus::Voided, $entry->status);
        $this->assertEquals('Salah input', $entry->void_reason);

        // Reversal entry created
        $reversalCount = JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('is_adjusting', true)
            ->count();

        $this->assertEquals(1, $reversalCount);
    }

    public function test_draft_cannot_be_voided(): void
    {
        $entry = $this->createDraftEntry();

        $this->actingAs($this->user)
            ->post("/jurnal/{$entry->id}/batal", ['reason' => 'Test'])
            ->assertSessionHas('error');
    }

    public function test_void_requires_reason(): void
    {
        $entry = $this->createDraftEntry();
        $entry->update(['status' => TransactionStatus::Posted]);

        $this->actingAs($this->user)
            ->post("/jurnal/{$entry->id}/batal", [])
            ->assertSessionHasErrors('reason');
    }

    // -----------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------

    public function test_draft_manual_can_be_deleted(): void
    {
        $entry = $this->createDraftEntry();

        $this->actingAs($this->user)
            ->delete("/jurnal/{$entry->id}")
            ->assertRedirect('/jurnal')
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('journal_entries', ['id' => $entry->id]);
    }

    public function test_posted_cannot_be_deleted(): void
    {
        $entry = $this->createDraftEntry();
        $entry->update(['status' => TransactionStatus::Posted]);

        $this->actingAs($this->user)
            ->delete("/jurnal/{$entry->id}")
            ->assertSessionHas('error');

        $this->assertDatabaseHas('journal_entries', ['id' => $entry->id]);
    }

    public function test_auto_draft_cannot_be_deleted_through_manual_delete(): void
    {
        $entry = $this->createDraftEntry();
        $entry->update(['is_manual' => false]);

        $this->actingAs($this->user)
            ->delete("/jurnal/{$entry->id}")
            ->assertSessionHas('error');

        $this->assertDatabaseHas('journal_entries', ['id' => $entry->id]);
    }

    // -----------------------------------------------------------------
    // Cross-company isolation
    // -----------------------------------------------------------------

    public function test_other_company_entry_cannot_be_accessed(): void
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing'],
            $otherUser
        );
        $otherUser->refresh();

        $foreignEntry = JournalEntry::withoutGlobalScope('company')->create([
            'company_id'   => $otherCompany->id,
            'entry_number' => 'JE-FOREIGN-001',
            'date'         => now()->toDateString(),
            'description'  => 'Foreign entry',
            'is_manual'    => true,
            'status'       => TransactionStatus::Draft,
            'created_by'   => $otherUser->id,
        ]);

        // BelongsToCompany global scope filters binding -> 404
        $this->actingAs($this->user)
            ->get("/jurnal/{$foreignEntry->id}")
            ->assertNotFound();
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private function balancedPayload(array $overrides = []): array
    {
        return array_merge([
            'date'         => now()->toDateString(),
            'description'  => 'Jurnal uji coba',
            'is_adjusting' => false,
            'lines'        => [
                ['account_id' => $this->cashAccount->id, 'debit' => 100000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 100000],
            ],
        ], $overrides);
    }

    private function createDraftEntry(): JournalEntry
    {
        $this->actingAs($this->user)->post('/jurnal', $this->balancedPayload());

        return JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('is_manual', true)
            ->latest('id')
            ->first();
    }
}
