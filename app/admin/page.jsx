import { StatsCards } from "@/src/admin/dashboard/stats-cards";
import { RevenueChart } from "@/src/admin/dashboard/revenue-chart";
import { RecentOrders } from "@/src/admin/dashboard/recent-orders";
import { TopProducts } from "@/src/admin/dashboard/top-products";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Package, ShoppingCart, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Tổng quan hoạt động kinh doanh
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-2 rounded-lg">
            <Link to="/admin/invoices">
              <FileText className="h-4 w-4" />
              Xem hóa đơn
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-lg">
            <Link to="/admin/products">
              <Package className="h-4 w-4" />
              Quản lý sản phẩm
            </Link>
          </Button>
          <Button asChild className="gap-2 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm">
            <Link to="/pos">
              <ShoppingCart className="h-4 w-4" />
              Mở POS
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <TopProducts />
      </div>

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  );
}