<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Services\NumberGeneratorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function __construct(
        protected NumberGeneratorService $numberGenerator,
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $query = Supplier::where('company_id', $companyId)
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

        $suppliers = $query->get()->map(fn(Supplier $s) => [
            'id' => $s->id,
            'code' => $s->code,
            'name' => $s->name,
            'email' => $s->email,
            'phone' => $s->phone,
            'is_active' => $s->is_active,
            'outstanding_payables' => (float) $s->outstanding_payables,
        ]);

        return Inertia::render('MasterData/Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('MasterData/Suppliers/Form');
    }

    public function show(Supplier $supplier): Response
    {
        $this->authorizeCompany($supplier);

        $supplier->load([
            'payables' => fn ($query) => $query->latest('date')->limit(5),
            'purchases' => fn ($query) => $query->latest('date')->limit(5),
        ]);

        return Inertia::render('MasterData/Suppliers/Show', [
            'supplier' => [
                'id' => $supplier->id,
                'code' => $supplier->code,
                'name' => $supplier->name,
                'email' => $supplier->email,
                'phone' => $supplier->phone,
                'address' => $supplier->address,
                'tax_id' => $supplier->tax_id,
                'notes' => $supplier->notes,
                'is_active' => $supplier->is_active,
                'outstanding_payables' => (float) $supplier->outstanding_payables,
                'total_payables' => $supplier->payables()->count(),
                'active_payables' => $supplier->payables()
                    ->where('status', TransactionStatus::Posted)
                    ->where('payment_status', '!=', PaymentStatus::Paid)
                    ->count(),
                'total_purchases' => $supplier->purchases()->count(),
            ],
            'recentPayables' => $supplier->payables->map(fn ($payable) => [
                'id' => $payable->id,
                'payable_number' => $payable->payable_number,
                'date' => optional($payable->date)->toDateString(),
                'due_date' => optional($payable->due_date)->toDateString(),
                'amount' => (float) $payable->amount,
                'paid_amount' => (float) $payable->paid_amount,
                'remaining_amount' => (float) $payable->remaining_amount,
                'status' => $payable->status->value,
                'status_label' => $payable->status->label(),
                'payment_status' => $payable->payment_status->value,
                'payment_status_label' => $payable->payment_status->label(),
            ])->values(),
            'recentPurchases' => $supplier->purchases->map(fn ($purchase) => [
                'id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'date' => optional($purchase->date)->toDateString(),
                'due_date' => optional($purchase->due_date)->toDateString(),
                'payment_type' => $purchase->payment_type,
                'payment_type_label' => $purchase->payment_type === 'cash' ? 'Tunai' : 'Kredit',
                'total_amount' => (float) $purchase->total_amount,
                'status' => $purchase->status->value,
                'status_label' => $purchase->status->label(),
            ])->values(),
        ]);
    }

    public function store(SupplierRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $companyId = auth()->user()->current_company_id;

        $data['company_id'] = $companyId;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['code'] = filled($data['code'] ?? null)
            ? $data['code']
            : $this->numberGenerator->generateSupplierCode($companyId);

        Supplier::create($data);

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Supplier berhasil ditambahkan.');
    }

    public function edit(Supplier $supplier): Response
    {
        $this->authorizeCompany($supplier);

        return Inertia::render('MasterData/Suppliers/Form', [
            'supplier' => [
                'id' => $supplier->id,
                'code' => $supplier->code,
                'name' => $supplier->name,
                'email' => $supplier->email,
                'phone' => $supplier->phone,
                'address' => $supplier->address,
                'tax_id' => $supplier->tax_id,
                'notes' => $supplier->notes,
                'is_active' => $supplier->is_active,
            ],
        ]);
    }

    public function update(SupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $this->authorizeCompany($supplier);

        $supplier->update($request->validated());

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Supplier berhasil diperbarui.');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $this->authorizeCompany($supplier);

        // Check if supplier has active payables
        $hasActive = $supplier->payables()
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->exists();

        if ($hasActive) {
            return back()->with('error', 'Supplier tidak dapat dihapus karena masih memiliki hutang aktif.');
        }

        $supplier->delete();

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Supplier berhasil dihapus.');
    }

    public function toggleActive(Supplier $supplier): RedirectResponse
    {
        $this->authorizeCompany($supplier);

        $supplier->update(['is_active' => !$supplier->is_active]);

        $status = $supplier->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Supplier berhasil {$status}.");
    }

    protected function authorizeCompany(Supplier $supplier): void
    {
        if ($supplier->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
