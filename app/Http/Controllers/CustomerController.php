<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerRequest;
use App\Models\Customer;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
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

    public function store(CustomerRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['company_id'] = auth()->user()->current_company_id;
        $data['is_active'] = $data['is_active'] ?? true;

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
