<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Emwal" />
    <meta property="og:url" content="https://emwal.id/" />
    <meta property="og:title" content="Emwal - Aplikasi Pencatatan Keuangan" />
    <meta property="og:description" content="Catat transaksi, hutang piutang, dan laporan keuangan dalam satu aplikasi." />
    <meta property="og:image" content="https://emwal.id/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    @if (app()->environment('production') && env('VITE_GA_MEASUREMENT_ID'))
        <script async src="https://www.googletagmanager.com/gtag/js?id={{ env('VITE_GA_MEASUREMENT_ID') }}"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;

            gtag('js', new Date());
            gtag('config', '{{ env('VITE_GA_MEASUREMENT_ID') }}', {
                send_page_view: false
            });
        </script>
    @endif
    
    <title inertia>{{ config('app.name', 'Akuntansi') }}</title>
    
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="font-sans antialiased">
    @inertia
</body>
</html>
