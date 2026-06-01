<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MenuSettingController extends Controller
{
    public function edit(Request $request): Response
    {
        $company = $request->user()->currentCompany;

        return Inertia::render('Settings/Menu', [
            'enabledMenus' => $company?->enabledMenus(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled_menus' => ['present', 'array'],
            'enabled_menus.*' => ['string', 'max:100'],
        ]);

        $company = $request->user()->currentCompany;

        $company->update([
            'settings' => array_merge($company->settings ?? [], [
                'enabled_menus' => array_values(array_unique($validated['enabled_menus'] ?? [])),
            ]),
        ]);

        return back()->with('success', 'Pengaturan tampilan menu berhasil disimpan.');
    }
}
