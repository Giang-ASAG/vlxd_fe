"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function formatPercentChange(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0,00";
    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(Math.abs(n));
}

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor }) {
    const changeNumber = Number(change);
    const isPositive = Number.isFinite(changeNumber) ? changeNumber >= 0 : true;
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold tracking-tight">{value}</p>
                        <div className="flex items-center gap-1">
                            {isPositive ? (
                                <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                            <span className={cn("text-sm font-medium", isPositive ? "text-success" : "text-destructive")}>
                                {isPositive ? "+" : ""}
                                {formatPercentChange(change)}%
                            </span>
                            <span className="text-sm text-muted-foreground">{changeLabel}</span>
                        </div>
                    </div>
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", iconColor)}>
                        <Icon className="h-6 w-6 text-card" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function formatCurrency(value) {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + " Triệu";
    if (value >= 1_000) return (value / 1_000).toFixed(1) + " Ngàn";
    return value.toString();
}

export function StatsCards() {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch("https://vlxdbe-production.up.railway.app/api/ThongKe/homnay")
            .then((res) => res.json())
            .then((json) => {
                if (json.success) setData(json.data);
            })
            .catch(console.error);
    }, []);

    const stats = [
        {
            title: "Doanh thu hôm nay",
            value: data ? formatCurrency(data.tongDoanhThu) : "...",
            change: data ? data.tyle_doanhthu : 0,
            changeLabel: "so với hôm qua",
            icon: DollarSign,
            iconColor: "bg-primary",
        },
        {
            title: "Đơn hàng hôm nay",
            value: data ? data.tongDonHang : "...",
            change: data ? data.tyle_donhang : 0,
            changeLabel: "so với hôm qua",
            icon: ShoppingCart,
            iconColor: "bg-accent",
        },
        {
            title: "Sản phẩm sắp hết hàng",
            value: data ? data.sanPhamSapHet : "...",
            change: 0,
            changeLabel: "cần xử lý",
            icon: Package,
            iconColor: "bg-chart-3",
        },
        {
            title: "Doanh thu năm nay",
            value: data ? formatCurrency(data.doanhThuNamNay) : "...",
            change: data ? data.tyle_theonam : 0,
            changeLabel: "",
            icon: Users,
            iconColor: "bg-chart-4",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
            ))}
        </div>
    );
}