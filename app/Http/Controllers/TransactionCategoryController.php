<?php

namespace App\Http\Controllers;

use App\Models\TransactionCategory;
use App\Models\Account;
use App\Enums\AccountType;
use App\Http\Requests\TransactionCategoryRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        $baseQuery = TransactionCategory::where('company_id', $companyId);

        $summary = [
            'count_all' => (clone $baseQuery)->count(),
            'count_income' => (clone $baseQuery)->where('type', 'income')->count(),
            'count_expense' => (clone $baseQuery)->where('type', 'expense')->count(),
        ];

        $typeFilter = $request->query('type', 'all');
        if (! in_array($typeFilter, ['all', 'income', 'expense'], true)) {
            $typeFilter = 'all';
        }

        $perPage = (int) $request->query('per_page', 25);
        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $categories = (clone $baseQuery)
            ->when($typeFilter !== 'all', fn ($query) => $query->where('type', $typeFilter))
            ->orderBy('type')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn ($cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'type' => $cat->type,
                'type_label' => $cat->type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                'description' => $cat->description,
                'is_active' => $cat->is_active,
            ]);

        return Inertia::render('MasterData/Categories/Index', [
            'categories' => $categories,
            'summary' => $summary,
            'filters' => [
                'type' => $typeFilter,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $revenueAccounts = Account::where('company_id', $companyId)
            ->ofType(AccountType::Revenue)
            ->active()
            ->whereDoesntHave('children')
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        $expenseAccounts = Account::where('company_id', $companyId)
            ->ofType(AccountType::Expense)
            ->active()
            ->whereDoesntHave('children')
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return Inertia::render('MasterData/Categories/Form', [
            'revenueAccounts' => $revenueAccounts,
            'expenseAccounts' => $expenseAccounts,
        ]);
    }

    public function store(TransactionCategoryRequest $request): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        TransactionCategory::create([
            'company_id' => $companyId,
            'account_id' => $request->account_id,
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
            'is_active' => true,
        ]);

        return redirect()->route('categories.index')
            ->with('success', 'Kategori berhasil ditambahkan');
    }

    public function edit(TransactionCategory $category): Response
    {
        $this->authorizeCompany($category);

        $companyId = auth()->user()->current_company_id;

        $revenueAccounts = Account::where('company_id', $companyId)
            ->ofType(AccountType::Revenue)
            ->active()
            ->whereDoesntHave('children')
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        $expenseAccounts = Account::where('company_id', $companyId)
            ->ofType(AccountType::Expense)
            ->active()
            ->whereDoesntHave('children')
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return Inertia::render('MasterData/Categories/Form', [
            'category' => [
                'id' => $category->id,
                'account_id' => $category->account_id,
                'name' => $category->name,
                'type' => $category->type,
                'description' => $category->description,
            ],
            'revenueAccounts' => $revenueAccounts,
            'expenseAccounts' => $expenseAccounts,
        ]);
    }

    public function update(TransactionCategoryRequest $request, TransactionCategory $category): RedirectResponse
    {
        $this->authorizeCompany($category);

        $category->update([
            'account_id' => $request->account_id,
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
        ]);

        return redirect()->route('categories.index')
            ->with('success', 'Kategori berhasil diperbarui');
    }

    public function destroy(TransactionCategory $category): RedirectResponse
    {
        $this->authorizeCompany($category);

        $hasTransactions = \App\Models\Transaction::where('category_id', $category->id)->exists();
        $hasReceivables = \App\Models\Receivable::where('category_id', $category->id)->exists();
        $hasPayables = \App\Models\Payable::where('category_id', $category->id)->exists();

        if ($hasTransactions || $hasReceivables || $hasPayables) {
            return back()->with('error', 'Kategori tidak dapat dihapus karena sudah digunakan dalam transaksi.');
        }

        $category->delete();

        return redirect()->route('categories.index')
            ->with('success', 'Kategori berhasil dihapus');
    }

    public function toggleActive(TransactionCategory $category): RedirectResponse
    {
        $this->authorizeCompany($category);

        $category->update(['is_active' => !$category->is_active]);

        $status = $category->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Kategori berhasil {$status}");
    }

    protected function authorizeCompany(TransactionCategory $category): void
    {
        if ($category->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
