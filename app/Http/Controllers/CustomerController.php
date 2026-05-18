<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerRequest;
use App\Models\Customer;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Services\NumberGeneratorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(
        protected NumberGeneratorService $numberGenerator,
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $query = Customer::where('company_id', $companyId)
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

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $customers = $query->get()->map(fn(Customer $c) => [
            'id' => $c->id,
            'code' => $c->code,
            'name' => $c->name,
            'email' => $c->email,
            'phone' => $c->phone,
            'is_active' => $c->is_active,
            'outstanding_receivables' => (float) $c->outstanding_receivables,
        ]);

        return Inertia::render('MasterData/Customers/Index', [
            'customers' => $customers,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('MasterData/Customers/Form');
    }

    public function show(Customer $customer): Response
    {
        $this->authorizeCompany($customer);

        $customer->load([
            'receivables' => fn ($query) => $query->latest('date')->limit(5),
            'sales' => fn ($query) => $query->latest('date')->limit(5),
        ]);

        return Inertia::render('MasterData/Customers/Show', [
            'customer' => [
                'id' => $customer->id,
                'code' => $customer->code,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'tax_id' => $customer->tax_id,
                'credit_limit' => $customer->credit_limit !== null ? (float) $customer->credit_limit : null,
                'notes' => $customer->notes,
                'is_active' => $customer->is_active,
                'outstanding_receivables' => (float) $customer->outstanding_receivables,
                'total_receivables' => $customer->receivables()->count(),
                'active_receivables' => $customer->receivables()
                    ->where('status', TransactionStatus::Posted)
                    ->where('payment_status', '!=', PaymentStatus::Paid)
                    ->count(),
                'total_sales' => $customer->sales()->count(),
            ],
            'recentReceivables' => $customer->receivables->map(fn ($receivable) => [
                'id' => $receivable->id,
                'receivable_number' => $receivable->receivable_number,
                'date' => optional($receivable->date)->toDateString(),
                'due_date' => optional($receivable->due_date)->toDateString(),
                'amount' => (float) $receivable->amount,
                'paid_amount' => (float) $receivable->paid_amount,
                'remaining_amount' => (float) $receivable->remaining_amount,
                'status' => $receivable->status->value,
                'status_label' => $receivable->status->label(),
                'payment_status' => $receivable->payment_status->value,
                'payment_status_label' => $receivable->payment_status->label(),
            ])->values(),
            'recentSales' => $customer->sales->map(fn ($sale) => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'date' => optional($sale->date)->toDateString(),
                'due_date' => optional($sale->due_date)->toDateString(),
                'payment_type' => $sale->payment_type,
                'payment_type_label' => $sale->payment_type === 'cash' ? 'Tunai' : 'Kredit',
                'total_amount' => (float) $sale->total_amount,
                'status' => $sale->status->value,
                'status_label' => $sale->status->label(),
            ])->values(),
        ]);
    }

    public function store(CustomerRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $companyId = auth()->user()->current_company_id;

        $data['company_id'] = $companyId;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['code'] = filled($data['code'] ?? null)
            ? $data['code']
            : $this->numberGenerator->generateCustomerCode($companyId);

        Customer::create($data);

        return redirect()
            ->route('customers.index')
            ->with('success', 'Pelanggan berhasil ditambahkan.');
    }

    public function edit(Customer $customer): Response
    {
        $this->authorizeCompany($customer);

        return Inertia::render('MasterData/Customers/Form', [
            'customer' => [
                'id' => $customer->id,
                'code' => $customer->code,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'tax_id' => $customer->tax_id,
                'credit_limit' => $customer->credit_limit,
                'notes' => $customer->notes,
                'is_active' => $customer->is_active,
            ],
        ]);
    }

    public function update(CustomerRequest $request, Customer $customer): RedirectResponse
    {
        $this->authorizeCompany($customer);

        $customer->update($request->validated());

        return redirect()
            ->route('customers.index')
            ->with('success', 'Pelanggan berhasil diperbarui.');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $this->authorizeCompany($customer);

        // Check if customer has active receivables
        $hasActive = $customer->receivables()
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->exists();

        if ($hasActive) {
            return back()->with('error', 'Pelanggan tidak dapat dihapus karena masih memiliki piutang aktif.');
        }

        $customer->delete();

        return redirect()
            ->route('customers.index')
            ->with('success', 'Pelanggan berhasil dihapus.');
    }

    public function toggleActive(Customer $customer): RedirectResponse
    {
        $this->authorizeCompany($customer);

        $customer->update(['is_active' => !$customer->is_active]);

        $status = $customer->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Pelanggan berhasil {$status}.");
    }

    protected function authorizeCompany(Customer $customer): void
    {
        if ($customer->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
