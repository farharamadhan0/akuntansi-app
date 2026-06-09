import { useState, useCallback } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, GripVertical, RotateCcw } from "lucide-react";
import {
    WIDGET_REGISTRY,
    getDefaultLayout,
    type WidgetLayoutItem,
    type WidgetSize,
} from "../widgets/registry";

interface CustomizeModalProps {
    open: boolean;
    layout: WidgetLayoutItem[];
    onSave: (layout: WidgetLayoutItem[]) => void;
    onClose: () => void;
}

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
    { value: "full", label: "Penuh" },
    { value: "1/2", label: "1/2" },
    { value: "2/3", label: "2/3" },
    { value: "1/3", label: "1/3" },
];

function SizeIcon({ cols, filled }: { cols: number; filled: number }) {
    return (
        <div className="flex gap-px">
            {Array.from({ length: cols }).map((_, i) => (
                <div
                    key={i}
                    className={`h-3 rounded-sm ${
                        i < filled ? "bg-blue-500" : "bg-gray-200"
                    }`}
                    style={{ width: `${12 / cols}px` }}
                />
            ))}
        </div>
    );
}

function getSizeIcon(size: WidgetSize) {
    switch (size) {
        case "full": return <SizeIcon cols={1} filled={1} />;
        case "1/2": return <SizeIcon cols={2} filled={1} />;
        case "2/3": return <SizeIcon cols={3} filled={2} />;
        case "1/3": return <SizeIcon cols={3} filled={1} />;
    }
}

function SizeSelector({
    value,
    onChange,
}: {
    value: WidgetSize;
    onChange: (size: WidgetSize) => void;
}) {
    return (
        <div className="flex gap-0.5 shrink-0">
            {SIZE_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => onChange(opt.value)}
                    className={`flex items-center justify-center w-7 h-6 rounded border text-[10px] font-medium transition-colors ${
                        value === opt.value
                            ? "border-blue-400 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600"
                    }`}
                >
                    {getSizeIcon(opt.value)}
                </button>
            ))}
        </div>
    );
}

function SortableItem({
    item,
    onToggle,
    onSizeChange,
}: {
    item: WidgetLayoutItem;
    onToggle: (widgetId: string) => void;
    onSizeChange: (widgetId: string, size: WidgetSize) => void;
}) {
    const meta = WIDGET_REGISTRY.find((w) => w.id === item.widgetId);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.widgetId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (!meta) return null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-wrap items-center gap-3 py-2.5 px-3 rounded-md border transition-colors select-none sm:flex-nowrap ${
                isDragging
                    ? "bg-blue-50 border-blue-300 shadow-md z-10 relative"
                    : item.visible
                        ? "bg-white border-gray-200"
                        : "bg-gray-50 border-gray-100 opacity-60"
            }`}
        >
            {/* Drag handle */}
            <button
                type="button"
                className="cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 rounded hover:bg-gray-100 transition-colors"
                {...attributes}
                {...listeners}
            >
                <GripVertical size={14} className="text-gray-400" />
            </button>

            {/* Checkbox */}
            <Checkbox
                checked={item.visible}
                onCheckedChange={() => onToggle(item.widgetId)}
            />

            {/* Label */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{meta.label}</p>
                <p className="text-xs text-gray-400 truncate" title={meta.description}>
                    {meta.description}
                </p>
            </div>

            {/* Size selector - only shown when visible */}
            {item.visible && (
                <div className="ml-10 sm:ml-0">
                    <SizeSelector
                        value={item.size}
                        onChange={(size) => onSizeChange(item.widgetId, size)}
                    />
                </div>
            )}
        </div>
    );
}

function LayoutPreview({ items }: { items: WidgetLayoutItem[] }) {
    const visible = items.filter((w) => w.visible);

    const rows: WidgetLayoutItem[][] = [];
    let currentRow: WidgetLayoutItem[] = [];
    let currentRowSpan = 0;

    for (const widget of visible) {
        const span =
            widget.size === "full" ? 6 :
            widget.size === "2/3" ? 4 :
            widget.size === "1/3" ? 2 :
            3; // 1/2

        if (widget.size === "full") {
            if (currentRow.length > 0) {
                rows.push(currentRow);
                currentRow = [];
                currentRowSpan = 0;
            }
            rows.push([widget]);
            continue;
        }

        if (currentRowSpan + span > 6) {
            rows.push(currentRow);
            currentRow = [];
            currentRowSpan = 0;
        }

        currentRow.push(widget);
        currentRowSpan += span;

        if (currentRowSpan >= 6) {
            rows.push(currentRow);
            currentRow = [];
            currentRowSpan = 0;
        }
    }

    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    const getColSpan = (size: WidgetSize) => {
        switch (size) {
            case "full": return 6;
            case "2/3": return 4;
            case "1/3": return 2;
            case "1/2": return 3;
        }
    };

    const getMeta = (widgetId: string) =>
        WIDGET_REGISTRY.find((w) => w.id === widgetId);

    return (
        <div className="space-y-1">
            {rows.map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-6 gap-1">
                    {row.map((widget) => {
                        const meta = getMeta(widget.widgetId);
                        return (
                            <div
                                key={widget.widgetId}
                                className="bg-blue-100 border border-blue-200 rounded px-1.5 py-1 text-[9px] text-blue-700 font-medium truncate text-center"
                                style={{
                                    gridColumn: `span ${getColSpan(widget.size)}`,
                                }}
                            >
                                {meta?.label ?? widget.widgetId}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export default function CustomizeModal({
    open,
    layout,
    onSave,
    onClose,
}: CustomizeModalProps) {
    const [items, setItems] = useState<WidgetLayoutItem[]>(() =>
        [...layout].sort((a, b) => a.order - b.order)
    );

    const resetToLayout = useCallback(
        (newLayout: WidgetLayoutItem[]) => {
            setItems([...newLayout].sort((a, b) => a.order - b.order));
        },
        []
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    if (!open) return null;

    const toggleVisibility = (widgetId: string) => {
        setItems((prev) =>
            prev.map((item) =>
                item.widgetId === widgetId
                    ? { ...item, visible: !item.visible }
                    : item
            )
        );
    };

    const changeSize = (widgetId: string, size: WidgetSize) => {
        setItems((prev) =>
            prev.map((item) =>
                item.widgetId === widgetId ? { ...item, size } : item
            )
        );
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setItems((prev) => {
            const oldIndex = prev.findIndex((i) => i.widgetId === active.id);
            const newIndex = prev.findIndex((i) => i.widgetId === over.id);
            const reordered = arrayMove(prev, oldIndex, newIndex);
            return reordered.map((item, i) => ({ ...item, order: i + 1 }));
        });
    };

    const handleReset = () => {
        resetToLayout(getDefaultLayout());
    };

    const handleSave = () => {
        onSave(items.map((item, i) => ({ ...item, order: i + 1 })));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-3 max-h-[90vh] flex flex-col sm:mx-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-4 py-4 border-b sm:px-5">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-800">
                            Sesuaikan Dashboard
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Drag untuk mengubah urutan, atur lebar grid tiap
                            widget
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>

                {/* Live Preview */}
                <div className="px-4 pt-3 pb-2 border-b bg-gray-50/50 sm:px-5">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                        Preview Layout
                    </p>
                    <LayoutPreview items={items} />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map((i) => i.widgetId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {items.map((item) => (
                                    <SortableItem
                                        key={item.widgetId}
                                        item={item}
                                        onToggle={toggleVisibility}
                                        onSizeChange={changeSize}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-2 px-4 py-3 border-t bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                    >
                        <RotateCcw size={12} />
                        Reset Default
                    </Button>
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="flex-1 sm:flex-none"
                        >
                            Batal
                        </Button>
                        <Button size="sm" onClick={handleSave} className="flex-1 sm:flex-none">
                            Simpan
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
