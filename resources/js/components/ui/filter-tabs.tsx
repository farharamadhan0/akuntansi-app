import { Button } from '@/components/ui/button';

export interface FilterTabItem<T extends string = string> {
    value: T;
    label: string;
    count?: number;
}

interface FilterTabsProps<T extends string = string> {
    items: FilterTabItem<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}

export function FilterTabs<T extends string = string>({
    items,
    value,
    onChange,
    className = '',
}: FilterTabsProps<T>) {
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {items.map((item) => {
                const active = value === item.value;
                return (
                    <Button
                        key={item.value}
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onChange(item.value)}
                    >
                        {item.label}
                        {typeof item.count === 'number' && (
                            <span
                                className={`ml-1.5 text-xs ${
                                    active ? 'opacity-80' : 'text-muted-foreground'
                                }`}
                            >
                                {item.count}
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    );
}
