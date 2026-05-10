import { type WidgetLayoutItem } from "../widgets/registry";
import SummaryCards from "../widgets/SummaryCards";
import TrendChart from "../widgets/TrendChart";
import TopExpense from "../widgets/TopExpense";
import ReceivableCard from "../widgets/ReceivableCard";
import PayableCard from "../widgets/PayableCard";
import CashBankCard from "../widgets/CashBankCard";
import RecentTransactions from "../widgets/RecentTransactions";
import type { DashboardData } from "../types";

const SIZE_CLASS: Record<string, string> = {
    full: "col-span-full",
    "2/3": "lg:col-span-2",
    "1/3": "lg:col-span-1",
    "1/2": "lg:col-span-1",
};

function renderWidget(widgetId: string, data: DashboardData) {
    switch (widgetId) {
        case "summary-cards":
            return (
                <SummaryCards
                    stats={data.stats}
                    cashBankAccountCount={data.cashBankAccounts.length}
                />
            );
        case "trend-chart":
            return <TrendChart trend={data.trend} />;
        case "top-expense":
            return (
                <TopExpense
                    topExpenseCategories={data.topExpenseCategories}
                    currentMonth={data.currentMonth}
                />
            );
        case "receivable":
            return (
                <ReceivableCard
                    stats={data.stats}
                    receivableAging={data.receivableAging}
                />
            );
        case "payable":
            return (
                <PayableCard
                    stats={data.stats}
                    payableAging={data.payableAging}
                />
            );
        case "cash-bank":
            return <CashBankCard cashBankAccounts={data.cashBankAccounts} />;
        case "recent-transactions":
            return (
                <RecentTransactions
                    recentTransactions={data.recentTransactions}
                />
            );
        default:
            return null;
    }
}

interface WidgetGridProps {
    layout: WidgetLayoutItem[];
    data: DashboardData;
}

export default function WidgetGrid({ layout, data }: WidgetGridProps) {
    const visible = layout
        .filter((w) => w.visible)
        .sort((a, b) => a.order - b.order);

    // Group widgets into rows based on their sizes
    const rows: WidgetLayoutItem[][] = [];
    let currentRow: WidgetLayoutItem[] = [];
    let currentRowSpan = 0;

    for (const widget of visible) {
        const span = widget.size === "full" ? 3 : widget.size === "2/3" ? 2 : widget.size === "1/3" ? 1 : 1.5;

        // "full" always gets its own row
        if (widget.size === "full") {
            if (currentRow.length > 0) {
                rows.push(currentRow);
                currentRow = [];
                currentRowSpan = 0;
            }
            rows.push([widget]);
            continue;
        }

        // Check if adding this widget exceeds 3 cols
        if (currentRowSpan + span > 3) {
            rows.push(currentRow);
            currentRow = [];
            currentRowSpan = 0;
        }

        currentRow.push(widget);
        currentRowSpan += span;

        // Row is complete at 3 cols
        if (currentRowSpan >= 3) {
            rows.push(currentRow);
            currentRow = [];
            currentRowSpan = 0;
        }
    }

    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    return (
        <div className="space-y-4">
            {rows.map((row, rowIdx) => {
                // Determine grid columns based on content
                const isFull = row.length === 1 && row[0].size === "full";
                const hasTwoThird = row.some((w) => w.size === "2/3");
                const gridCols = isFull
                    ? ""
                    : hasTwoThird
                        ? "grid grid-cols-1 lg:grid-cols-3 gap-4"
                        : "grid grid-cols-1 lg:grid-cols-2 gap-4";

                if (isFull) {
                    return (
                        <div key={rowIdx}>
                            {renderWidget(row[0].widgetId, data)}
                        </div>
                    );
                }

                return (
                    <div key={rowIdx} className={gridCols}>
                        {row.map((widget) => (
                            <div
                                key={widget.widgetId}
                                className={SIZE_CLASS[widget.size] || ""}
                            >
                                {renderWidget(widget.widgetId, data)}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
