<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Http\Requests\PartnerRequest;
use App\Models\Partner;
use App\Services\NumberGeneratorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    public function __construct(
        protected NumberGeneratorService $numberGenerator,
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $query = Partner::where('company_id', $companyId)
            ->with('typeAssignments')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $status = $request->filled('status') ? $request->status : 'active';
        if ($status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        $type = $request->filled('type') ? $request->type : 'all';
        if (in_array($type, Partner::TYPES, true)) {
            $query->ofType($type);
        }

        $partners = $query->get()->map(fn (Partner $p) => [
            'id' => $p->id,
            'code' => $p->code,
            'name' => $p->name,
            'email' => $p->email,
            'phone' => $p->phone,
            'is_active' => $p->is_active,
            'types' => $p->types,
        ]);

        return Inertia::render('MasterData/Partners/Index', [
            'partners' => $partners,
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('MasterData/Partners/Form');
    }

    public function show(Partner $partner): Response
    {
        $this->authorizeCompany($partner);

        $partner->load([
            'typeAssignments',
            'receivables' => fn ($q) => $q->latest('date')->limit(5),
            'payables' => fn ($q) => $q->latest('date')->limit(5),
            'sales' => fn ($q) => $q->latest('date')->limit(5),
            'purchases' => fn ($q) => $q->latest('date')->limit(5),
        ]);

        return Inertia::render('MasterData/Partners/Show', [
            'partner' => [
                'id' => $partner->id,
                'code' => $partner->code,
                'name' => $partner->name,
                'email' => $partner->email,
                'phone' => $partner->phone,
                'address' => $partner->address,
                'tax_id' => $partner->tax_id,
                'credit_limit' => $partner->credit_limit !== null ? (float) $partner->credit_limit : null,
                'notes' => $partner->notes,
                'is_active' => $partner->is_active,
                'types' => $partner->types,
                'is_customer' => $partner->is_customer,
                'is_supplier' => $partner->is_supplier,
                'outstanding_receivables' => (float) $partner->outstanding_receivables,
                'outstanding_payables' => (float) $partner->outstanding_payables,
                'total_receivables' => $partner->receivables()->count(),
                'active_receivables' => $partner->receivables()
                    ->where('status', TransactionStatus::Posted)
                    ->where('payment_status', '!=', PaymentStatus::Paid)
                    ->count(),
                'total_payables' => $partner->payables()->count(),
                'active_payables' => $partner->payables()
                    ->where('status', TransactionStatus::Posted)
                    ->where('payment_status', '!=', PaymentStatus::Paid)
                    ->count(),
                'total_sales' => $partner->sales()->count(),
                'total_purchases' => $partner->purchases()->count(),
            ],
            'recentReceivables' => $partner->receivables->map(fn ($r) => [
                'id' => $r->id,
                'receivable_number' => $r->receivable_number,
                'date' => optional($r->date)->toDateString(),
                'due_date' => optional($r->due_date)->toDateString(),
                'amount' => (float) $r->amount,
                'paid_amount' => (float) $r->paid_amount,
                'remaining_amount' => (float) $r->remaining_amount,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'payment_status' => $r->payment_status->value,
                'payment_status_label' => $r->payment_status->label(),
            ])->values(),
            'recentPayables' => $partner->payables->map(fn ($p) => [
                'id' => $p->id,
                'payable_number' => $p->payable_number,
                'date' => optional($p->date)->toDateString(),
                'due_date' => optional($p->due_date)->toDateString(),
                'amount' => (float) $p->amount,
                'paid_amount' => (float) $p->paid_amount,
                'remaining_amount' => (float) $p->remaining_amount,
                'status' => $p->status->value,
                'status_label' => $p->status->label(),
                'payment_status' => $p->payment_status->value,
                'payment_status_label' => $p->payment_status->label(),
            ])->values(),
            'recentSales' => $partner->sales->map(fn ($s) => [
                'id' => $s->id,
                'sale_number' => $s->sale_number,
                'date' => optional($s->date)->toDateString(),
                'due_date' => optional($s->due_date)->toDateString(),
                'payment_type' => $s->payment_type,
                'payment_type_label' => $s->payment_type === 'cash' ? 'Tunai' : 'Kredit',
                'total_amount' => (float) $s->total_amount,
                'status' => $s->status->value,
                'status_label' => $s->status->label(),
            ])->values(),
            'recentPurchases' => $partner->purchases->map(fn ($p) => [
                'id' => $p->id,
                'purchase_number' => $p->purchase_number,
                'date' => optional($p->date)->toDateString(),
                'due_date' => optional($p->due_date)->toDateString(),
                'payment_type' => $p->payment_type,
                'payment_type_label' => $p->payment_type === 'cash' ? 'Tunai' : 'Kredit',
                'total_amount' => (float) $p->total_amount,
                'status' => $p->status->value,
                'status_label' => $p->status->label(),
            ])->values(),
        ]);
    }

    public function store(PartnerRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $companyId = auth()->user()->current_company_id;

        $types = $data['types'];
        unset($data['types']);

        $data['company_id'] = $companyId;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['code'] = filled($data['code'] ?? null)
            ? $data['code']
            : $this->numberGenerator->generatePartnerCode($companyId);

        DB::transaction(function () use ($data, $types) {
            $partner = Partner::create($data);
            $partner->syncTypes($types);
        });

        return redirect()
            ->route('partners.index')
            ->with('success', 'Mitra berhasil ditambahkan.');
    }

    public function edit(Partner $partner): Response
    {
        $this->authorizeCompany($partner);
        $partner->load('typeAssignments');

        return Inertia::render('MasterData/Partners/Form', [
            'partner' => [
                'id' => $partner->id,
                'code' => $partner->code,
                'name' => $partner->name,
                'email' => $partner->email,
                'phone' => $partner->phone,
                'address' => $partner->address,
                'tax_id' => $partner->tax_id,
                'credit_limit' => $partner->credit_limit,
                'notes' => $partner->notes,
                'is_active' => $partner->is_active,
                'types' => $partner->types,
            ],
        ]);
    }

    public function update(PartnerRequest $request, Partner $partner): RedirectResponse
    {
        $this->authorizeCompany($partner);

        $data = $request->validated();
        $types = $data['types'];
        unset($data['types']);

        DB::transaction(function () use ($partner, $data, $types) {
            $partner->update($data);
            $partner->syncTypes($types);
        });

        return redirect()
            ->route('partners.index')
            ->with('success', 'Mitra berhasil diperbarui.');
    }

    public function destroy(Partner $partner): RedirectResponse
    {
        $this->authorizeCompany($partner);

        $hasActiveReceivables = $partner->receivables()
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->exists();

        $hasActivePayables = $partner->payables()
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->exists();

        if ($hasActiveReceivables || $hasActivePayables) {
            return back()->with(
                'error',
                'Mitra tidak dapat dihapus karena masih memiliki piutang atau hutang aktif.'
            );
        }

        $partner->delete();

        return redirect()
            ->route('partners.index')
            ->with('success', 'Mitra berhasil dihapus.');
    }

    public function toggleActive(Partner $partner): RedirectResponse
    {
        $this->authorizeCompany($partner);

        $partner->update(['is_active' => ! $partner->is_active]);

        $status = $partner->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Mitra berhasil {$status}.");
    }

    protected function authorizeCompany(Partner $partner): void
    {
        if ($partner->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
