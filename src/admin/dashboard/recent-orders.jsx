"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  da_thanh_toan: { label: "Hoàn thành", className: "bg-success/10 text-success border-success/20" },
  chua_thanh_toan: { label: "Chờ thanh toán", className: "bg-warning/10 text-warning-foreground border-warning/20" },
  thanh_toan_mot_phan: { label: "Thanh toán 1 phần", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  da_huy: { label: "Đã hủy", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function RecentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("https://vlxdbe-production.up.railway.app/api/ThongKe/donhangGanNhat");
        const json = await res.json();
        if (json.success) setOrders(json.data);
      } catch (err) {
        console.error("Lỗi khi tải đơn hàng gần nhất:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Đơn hàng gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
            Đang tải...
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.trangThaiThanhToan] ?? {
                label: order.trangThaiThanhToan,
                className: "bg-muted text-muted-foreground border-muted",
              };
              return (
                <div
                  key={order.maDonHang}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">HD{String(order.maDonHang).padStart(3, "0")}</span>
                      <Badge variant="outline" className={cn("text-xs", status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{order.tenKhachHang}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.tongTien)}đ</p>
                    <p className="text-xs text-muted-foreground">{order.thoiGianHienThi}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}