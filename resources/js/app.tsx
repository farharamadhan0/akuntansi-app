import '../css/app.css';
import './bootstrap';

import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import './global.css';

const appName = import.meta.env.VITE_APP_NAME || 'Emwal';
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

function trackPageView(url: string) {
    if (!gaMeasurementId || typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
        page_location: new URL(url, window.location.origin).href,
        page_path: url,
        page_title: document.title,
    });
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolve: (name: string) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx')
        ) as any,
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
        trackPageView(props.initialPage.url);
    },
    progress: {
        color: '#4f46e5',
    },
});

router.on('navigate', (event) => {
    trackPageView(event.detail.page.url);
});
