"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ThongKeService } from "@/src/services/api-services";
import { TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  return `${(value / 1000).toFixed(0)}K`;
};

export function RevenueChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await ThongKeService.doanhThuTuan();
        if (data?.success) {
          setData(data.data.map((item) => ({
            name: item.ngay,
            revenue: item.doanhThu,
          })));
        }
      } catch (err) {
        console.error("Lỗi khi tải doanh thu tuần:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Tính tổng doanh thu tuần
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;

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
              <h3 className="font-semibold text-foreground">Doanh thu tuần này</h3>
              <p className="text-xs text-muted-foreground">Biểu đồ doanh thu 7 ngày gần nhất</p>
            </div>
          </div>
          {!loading && data.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
              <p className="text-lg font-bold text-primary">
                {new Intl.NumberFormat("vi-VN").format(totalRevenue)}đ
              </p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-[320px] p-4">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Đang tải dữ liệu doanh thu...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <TrendingUp className="h-8 w-8 opacity-40" />
              <p className="text-sm">Không có dữ liệu doanh thu</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tickFormatter={formatCurrency}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ 
                      color: "hsl(var(--foreground))", 
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                    formatter={(value) => [
                      new Intl.NumberFormat("vi-VN").format(value) + "đ", 
                      "Doanh thu"
                    ]}
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              {/* Summary stats */}
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-medium text-foreground">Trung bình/ngày: </span>
                    <span className="font-semibold text-primary">
                      {new Intl.NumberFormat("vi-VN").format(avgRevenue)}đ
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Ngày cao nhất: </span>
                    <span className="font-semibold text-emerald-600">
                      {data.reduce((max, item) => item.revenue > max.revenue ? item : max, data[0])?.name || "--"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}