import { StatsCards } from "@/src/admin/dashboard/stats-cards";
import { RevenueChart } from "@/src/admin/dashboard/revenue-chart";
import { RecentOrders } from "@/src/admin/dashboard/recent-orders";
import { TopProducts } from "@/src/admin/dashboard/top-products";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Package, ShoppingCart } from "lucide-react";
export default function DashboardPage() {
  return (<div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Tong quan hoat dong kinh doanh</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin/invoices">
            <FileText className="h-4 w-4" />
            Xem hoa don
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin/products">
            <Package className="h-4 w-4" />
            Quan ly san pham
          </Link>
        </Button>
        <Button asChild className="gap-2">
          <Link to="/pos">
            <ShoppingCart className="h-4 w-4" />
            Mo POS
          </Link>
        </Button>
      </div>
    </div>

    {/* Stats */}
    <StatsCards />

    {/* Charts Row */}
    <div className="grid gap-6 lg:grid-cols-2">
      <RevenueChart />
      <TopProducts />
    </div>

    {/* Recent Orders */}
    <RecentOrders />
  </div>);
}
