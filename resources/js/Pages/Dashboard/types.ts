import type { WidgetLayoutItem } from "./widgets/registry";

export interface Stats {
    incomeThisMonth: number;
    incomeLastMonth: number;
    expenseThisMonth: number;
    expenseLastMonth: number;
    salesThisMonth: number;
    salesLastMonth: number;
    netProfit: number;
    netProfitLastMonth: number;
    totalCashBank: number;
    cashBankAccountCount: number;
    receivableOutstanding: number;
    receivableOutstandingCount: number;
    receivableOverdue: number;
    receivableOverdueCount: number;
    receivableDueSoon: number;
    receivableDueSoonCount: number;
    payableOutstanding: number;
    payableOutstandingCount: number;
    payableOverdue: number;
    payableOverdueCount: number;
    payableDueSoon: number;
    payableDueSoonCount: number;
    draftCount: number;
}

export interface AgingBucket {
    total: number;
    count: number;
}

export interface Aging {
    current: AgingBucket;
    d1_30: AgingBucket;
    d31_60: AgingBucket;
    d61_90: AgingBucket;
    d90_plus: AgingBucket;
}

export interface TrendPoint {
    period: string;
    label: string;
    income: number;
    expense: number;
}

export interface TopCategory {
    name: string;
    total: number;
}

export interface StockAttention {
    lowStockCount: number;
    negativeStockCount: number;
    unsoldThirtyDaysCount: number;
}

export interface CashBankAccount {
    id: number;
    name: string;
    type: "cash" | "bank";
    balance: number;
}

export interface RecentTransaction {
    id: number;
    transaction_number: string;
    type: "income" | "expense";
    date: string;
    amount: number;
    description: string;
    cash_bank_name: string;
    category_name?: string;
}

export interface DashboardData {
    stats: Stats;
    cashBankAccounts: CashBankAccount[];
    recentTransactions: RecentTransaction[];
    receivableAging: Aging;
    payableAging: Aging;
    trend: TrendPoint[];
    topExpenseCategories: TopCategory[];
    stockAttention: StockAttention;
    currentMonth: string;
}

export interface DashboardProps extends DashboardData {
    layout: WidgetLayoutItem[];
}
