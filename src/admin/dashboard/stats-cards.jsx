"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThongKeService } from "@/src/services/api-services";

function formatPercentChange(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0,00";
    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(Math.abs(n));
}

function formatCurrency(value) {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + " Triệu";
    if (value >= 1_000) return (value / 1_000).toFixed(1) + " Ngàn";
    return value.toString();
}

function formatFullCurrency(value) {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor, fullValue }) {
    const changeNumber = Number(change);
    const isPositive = Number.isFinite(changeNumber) ? changeNumber >= 0 : true;
    const isRevenueCard = title === "Doanh thu hôm nay" || title === "Doanh thu năm nay";
    
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
                <div className="flex items-center gap-4">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconColor)}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="text-2xl font-bold">{value}</p>
                            {isRevenueCard && fullValue && (
                                <span className="text-xs text-muted-foreground">({fullValue})</span>
                            )}
                        </div>
                        {changeLabel && (
                            <div className="flex items-center gap-1 mt-1">
                                {isPositive ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                                )}
                                <span className={cn("text-xs font-medium", isPositive ? "text-emerald-600" : "text-destructive")}>
                                    {isPositive ? "+" : ""}{formatPercentChange(change)}%
                                </span>
                                <span className="text-xs text-muted-foreground">{changeLabel}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function StatsCards() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ThongKeService.homNay()
            .then((data) => { 
                if (data?.success) setData(data.data); 
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Format giá trị đầy đủ cho card doanh thu
    const fullRevenueToday = data?.tongDoanhThu ? formatFullCurrency(data.tongDoanhThu) : null;
    const fullRevenueYear = data?.doanhThuNamNay ? formatFullCurrency(data.doanhThuNamNay) : null;

    const stats = [
        {
            title: "Doanh thu hôm nay",
            value: data ? formatCurrency(data.tongDoanhThu) : "...",
            fullValue: fullRevenueToday,
            change: data ? data.tyle_doanhthu : 0,
            changeLabel: "so với hôm qua",
            icon: DollarSign,
            iconColor: "bg-primary",
        },
        {
            title: "Đơn hàng hôm nay",
            value: data ? data.tongDonHang?.toLocaleString("vi-VN") : "...",
            fullValue: null,
            change: data ? data.tyle_donhang : 0,
            changeLabel: "so với hôm qua",
            icon: ShoppingCart,
            iconColor: "bg-accent",
        },
        {
            title: "Sản phẩm sắp hết hàng",
            value: data ? data.sanPhamSapHet?.toLocaleString("vi-VN") : "...",
            fullValue: null,
            change: 0,
            changeLabel: "cần xử lý",
            icon: Package,
            iconColor: "bg-amber-500",
        },
        {
            title: "Doanh thu năm nay",
            value: data ? formatCurrency(data.doanhThuNamNay) : "...",
            fullValue: fullRevenueYear,
            change: data ? data.tyle_theonam : 0,
            changeLabel: "so với năm trước",
            icon: Users,
            iconColor: "bg-emerald-600",
        },
    ];

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-0 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-4">
                                <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                                    <div className="h-7 w-28 bg-muted rounded animate-pulse" />
                                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
            ))}
        </div>
    );
}