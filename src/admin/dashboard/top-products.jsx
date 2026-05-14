"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function TopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const res = await fetch("http://localhost:5128/api/ThongKe/spBanChay?limit=5");
        const json = await res.json();
        if (json.success) {
          setProducts(json.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm bán chạy:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Sản phẩm bán chạy</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <div className="space-y-4">
            {products.map((product, index) => {
              const percentage = Math.min((product.soLuongDaBan / product.tongTonKho) * 100, 100);
              const revenue = product.tongDoanhThu.toLocaleString("vi-VN");

              return (
                <div key={product.maSanPham} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{product.tenSanPham}</span>
                    </div>
                    <span className="text-sm font-semibold">{revenue}đ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={percentage} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-24 text-right">
                      {product.soLuongDaBan.toLocaleString("vi-VN")}/{product.tongTonKho.toLocaleString("vi-VN")}
                    </span>
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