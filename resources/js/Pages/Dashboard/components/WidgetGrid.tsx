import { type WidgetLayoutItem, type WidgetSize } from "../widgets/registry";
import SummaryCards from "../widgets/SummaryCards";
import SalesMarginCard from "../widgets/SalesMarginCard";
import CashRunwayCard from "../widgets/CashRunwayCard";
import CashFlowCard from "../widgets/CashFlowCard";
import TrendChart from "../widgets/TrendChart";
import TopExpense from "../widgets/TopExpense";
import ReceivableCard from "../widgets/ReceivableCard";
import PayableCard from "../widgets/PayableCard";
import CashBankCard from "../widgets/CashBankCard";
import StockAttentionCard from "../widgets/StockAttentionCard";
import RecentTransactions from "../widgets/RecentTransactions";
import type { DashboardData } from "../types";

function getColSpan(size: WidgetSize): number {
    switch (size) {
        case "full": return 6;
        case "2/3": return 4;
        case "1/3": return 2;
        case "1/2": return 3;
    }
}

function renderWidget(widgetId: string, data: DashboardData) {
    switch (widgetId) {
        case "summary-cards":
            return <SummaryCards stats={data.stats} />;
        case "sales-margin":
            return (
                <SalesMarginCard
                    stats={data.stats}
                    currentMonth={data.currentMonth}
                />
            );
        case "cash-runway":
            return <CashRunwayCard stats={data.stats} />;
        case "cash-flow":
            return <CashFlowCard stats={data.stats} />;
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
        case "stock-attention":
            return <StockAttentionCard stockAttention={data.stockAttention} />;
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

const COL_SPAN_CLASS: Record<number, string> = {
    2: "lg:col-span-2",
    3: "lg:col-span-3",
    4: "lg:col-span-4",
    6: "lg:col-span-6",
};

export default function WidgetGrid({ layout, data }: WidgetGridProps) {
    const visible = layout
        .filter((w) => w.visible)
        .sort((a, b) => a.order - b.order);

    // Group widgets into rows (max 6 cols per row)
    const rows: WidgetLayoutItem[][] = [];
    let currentRow: WidgetLayoutItem[] = [];
    let currentRowSpan = 0;

    for (const widget of visible) {
        const span = getColSpan(widget.size);

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

    return (
        <div className="space-y-4">
            {rows.map((row, rowIdx) => {
                const isFull = row.length === 1 && row[0].size === "full";

                if (isFull) {
                    return (
                        <div key={rowIdx}>
                            {renderWidget(row[0].widgetId, data)}
                        </div>
                    );
                }

                return (
                    <div
                        key={rowIdx}
                        className="grid grid-cols-1 lg:grid-cols-6 gap-4"
                    >
                        {row.map((widget) => (
                            <div
                                key={widget.widgetId}
                                className={COL_SPAN_CLASS[getColSpan(widget.size)] || ""}
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
