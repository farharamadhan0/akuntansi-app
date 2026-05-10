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
} from "../widgets/registry";

interface CustomizeModalProps {
    open: boolean;
    layout: WidgetLayoutItem[];
    onSave: (layout: WidgetLayoutItem[]) => void;
    onClose: () => void;
}

function SortableItem({
    item,
    onToggle,
}: {
    item: WidgetLayoutItem;
    onToggle: (widgetId: string) => void;
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
            className={`flex items-center gap-3 py-2.5 px-3 rounded-md border transition-colors select-none ${
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
                <p className="text-xs text-gray-400 truncate">
                    {meta.description}
                </p>
            </div>
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
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-800">
                            Sesuaikan Dashboard
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Drag untuk mengubah urutan, toggle untuk
                            menampilkan/menyembunyikan
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
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
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                    >
                        <RotateCcw size={12} />
                        Reset Default
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                            Simpan
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
