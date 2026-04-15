import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
    label?: string;
    error?: string;
    required?: boolean;
    hint?: string;
    children: ReactNode;
    className?: string;
}

export function FormField({ label, error, required, hint, children, className }: FormFieldProps) {
    return (
        <div className={cn('space-y-1', className)}>
            {label && (
                <label className="text-xs font-medium text-foreground">
                    {label}
                    {required && <span className="ml-0.5 text-destructive">*</span>}
                </label>
            )}
            {children}
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
