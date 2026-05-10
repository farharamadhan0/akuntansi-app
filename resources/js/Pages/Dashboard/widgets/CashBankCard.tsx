import { Link } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatCurrency } from "../helpers";

interface CashBankAccount {
    id: number;
    name: string;
    type: "cash" | "bank";
    balance: number;
}

interface CashBankCardProps {
    cashBankAccounts: CashBankAccount[];
}

export default function CashBankCard({ cashBankAccounts }: CashBankCardProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                        Saldo Kas & Bank
                    </h2>
                    <Link
                        href="/master/kas-bank"
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Kelola
                    </Link>
                </div>
                {cashBankAccounts.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-400">
                            Belum ada akun kas/bank
                        </p>
                        <Link
                            href="/master/kas-bank/tambah"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                            + Tambah Kas/Bank
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {cashBankAccounts.map((acc) => (
                            <div
                                key={acc.id}
                                className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className={`p-1.5 rounded ${acc.type === "cash" ? "bg-green-50" : "bg-blue-50"}`}
                                    >
                                        <Wallet
                                            size={14}
                                            className={
                                                acc.type === "cash"
                                                    ? "text-green-600"
                                                    : "text-blue-600"
                                            }
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-700 truncate">
                                            {acc.name}
                                        </p>
                                        <p className="text-xs text-gray-400 capitalize">
                                            {acc.type === "cash" ? "Kas" : "Bank"}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`text-sm font-semibold whitespace-nowrap ml-2 ${acc.balance >= 0 ? "text-gray-900" : "text-red-600"}`}
                                >
                                    {formatCurrency(acc.balance)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
