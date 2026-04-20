<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
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

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
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

    public function store(SupplierRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['company_id'] = auth()->user()->current_company_id;
        $data['is_active'] = $data['is_active'] ?? true;

        Supplier::create($data);

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Pemasok berhasil ditambahkan.');
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
            ->with('success', 'Pemasok berhasil diperbarui.');
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
            return back()->with('error', 'Pemasok tidak dapat dihapus karena masih memiliki hutang aktif.');
        }

        $supplier->delete();

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Pemasok berhasil dihapus.');
    }

    public function toggleActive(Supplier $supplier): RedirectResponse
    {
        $this->authorizeCompany($supplier);

        $supplier->update(['is_active' => !$supplier->is_active]);

        $status = $supplier->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Pemasok berhasil {$status}.");
    }

    protected function authorizeCompany(Supplier $supplier): void
    {
        if ($supplier->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
