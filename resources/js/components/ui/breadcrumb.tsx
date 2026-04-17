import { Link } from '@inertiajs/react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
    return (
        <nav
            className="flex items-center gap-1 text-sm text-muted-foreground mb-5"
            aria-label="Breadcrumb"
        >
            <Link
                href="/"
                className="flex items-center hover:text-foreground transition-colors"
                aria-label="Dashboard"
            >
                <Home size={14} />
            </Link>
            {items.map((item, i) => {
                const isLast = i === items.length - 1;
                return (
                    <span key={i} className="flex items-center gap-1">
                        <ChevronRight size={13} className="text-muted-foreground/40" />
                        {!isLast && item.href ? (
                            <Link
                                href={item.href}
                                className="hover:text-foreground transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span
                                className={
                                    isLast ? 'text-foreground font-medium' : ''
                                }
                            >
                                {item.label}
                            </span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
