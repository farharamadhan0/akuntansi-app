<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://emwal.id/" />
    <meta property="og:title" content="Emwal - Aplikasi Pencatatan Keuangan" />
    <meta property="og:description" content="Catat transaksi, hutang piutang, dan laporan keuangan dalam satu aplikasi." />
    <meta property="og:image" content="https://emwal.id/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <title inertia>{{ config('app.name', 'Akuntansi') }}</title>
    
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="font-sans antialiased">
    @inertia
</body>
</html>
