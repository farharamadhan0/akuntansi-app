<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\CompanySetupService;
use Illuminate\Console\Command;

class SyncSystemAccountsCommand extends Command
{
    protected $signature = 'accounts:sync-system {--company= : Sync only the given company ID}';

    protected $description = 'Backfill any missing default system chart-of-accounts entries for existing companies.';

    public function handle(CompanySetupService $setup): int
    {
        $query = Company::query();

        if ($companyId = $this->option('company')) {
            $query->where('id', $companyId);
        }

        $companies = $query->get();

        if ($companies->isEmpty()) {
            $this->warn('No companies found.');
            return self::SUCCESS;
        }

        $totalCreated = 0;

        foreach ($companies as $company) {
            $created = $setup->syncSystemAccounts($company);
            $totalCreated += $created;

            $this->line(sprintf(
                '[%d] %s — %d account(s) created',
                $company->id,
                $company->name,
                $created
            ));
        }

        $this->info(sprintf('Done. %d account(s) created across %d company(ies).', $totalCreated, $companies->count()));

        return self::SUCCESS;
    }
}
