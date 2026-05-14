"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ThongKeService } from "@/src/services/api-services";
import { Package, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const data = await ThongKeService.spBanChay(5);
        if (data?.success) setProducts(data.data);
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm bán chạy:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopProducts();
  }, []);

  // Tính tổng doanh thu
  const totalRevenue = products.reduce((sum, p) => sum + p.tongDoanhThu, 0);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Sản phẩm bán chạy</h3>
              <p className="text-xs text-muted-foreground">Top 5 sản phẩm có doanh số cao nhất</p>
            </div>
          </div>
          {!loading && products.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
              <p className="text-base font-bold text-primary">
                {new Intl.NumberFormat("vi-VN").format(totalRevenue)}đ
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Đang tải sản phẩm...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <Package className="h-8 w-8 opacity-40" />
              <p className="text-sm">Không có dữ liệu sản phẩm</p>
            </div>
          ) : (
            <div className="space-y-5">
              {products.map((product, index) => {
                const percentage = Math.min((product.soLuongDaBan / product.tongTonKho) * 100, 100);
                const revenue = product.tongDoanhThu.toLocaleString("vi-VN");
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;

                // Màu sắc cho top ranking
                const rankColor = isTop1 ? "bg-amber-500 text-white" : 
                                 isTop2 ? "bg-gray-400 text-white" : 
                                 isTop3 ? "bg-amber-700 text-white" : 
                                 "bg-muted text-muted-foreground";

                return (
                  <div key={product.maSanPham} className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all",
                          rankColor,
                          !isTop1 && !isTop2 && !isTop3 && "bg-muted/50"
                        )}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="text-sm font-medium line-clamp-1">{product.tenSanPham}</span>
                          <span className="text-xs text-muted-foreground">
                            Đã bán: {product.soLuongDaBan.toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{revenue}đ</p>
                        <p className="text-xs text-muted-foreground">
                          {((product.tongDoanhThu / totalRevenue) * 100).toFixed(1)}% tổng
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={percentage} 
                        className={cn(
                          "h-2 flex-1 transition-all",
                          isTop1 && "[&>div]:bg-amber-500",
                          isTop2 && "[&>div]:bg-gray-400",
                          isTop3 && "[&>div]:bg-amber-700"
                        )} 
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {product.soLuongDaBan.toLocaleString("vi-VN")}/{product.tongTonKho.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}