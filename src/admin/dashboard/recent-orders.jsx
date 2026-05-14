"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThongKeService } from "@/src/services/api-services";
import { ShoppingBag, Loader2 } from "lucide-react";

const statusConfig = {
  da_thanh_toan: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  chua_thanh_toan: { label: "Chờ thanh toán", className: "bg-amber-100 text-amber-700 border-amber-200" },
  thanh_toan_mot_phan: { label: "Thanh toán 1 phần", className: "bg-blue-100 text-blue-700 border-blue-200" },
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
        const data = await ThongKeService.donHangGanNhat();
        if (data?.success) setOrders(data.data);
      } catch (err) {
        console.error("Lỗi khi tải đơn hàng gần nhất:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Đơn hàng gần đây</h3>
            <p className="text-xs text-muted-foreground">Danh sách đơn hàng mới nhất</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Đang tải đơn hàng...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingBag className="h-8 w-8 opacity-40" />
            <p className="text-sm">Không có đơn hàng nào</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map((order) => {
              const status = statusConfig[order.trangThaiThanhToan] ?? {
                label: order.trangThaiThanhToan,
                className: "bg-muted text-muted-foreground border-muted",
              };
              return (
                <div
                  key={order.maDonHang}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        HD{String(order.maDonHang).padStart(3, "0")}
                      </span>
                      <Badge variant="outline" className={cn("text-xs font-normal", status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{order.tenKhachHang}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(order.tongTien)}đ</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.thoiGianHienThi}</p>
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