"use client";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Users, FileText, Truck, BarChart3, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
const navigation = [
    { name: "Tổng quan", href: "/admin", icon: LayoutDashboard },
    { name: "Sản phẩm", href: "/admin/products", icon: Package },
    { name: "Khách hàng", href: "/admin/customers", icon: Users },
    { name: "Hóa đơn", href: "/admin/invoices", icon: FileText },
    { name: "Nhà cung cấp", href: "/admin/suppliers", icon: Truck },
    { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
];
export function AdminSidebar() {
    const { pathname } = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    return (<aside className={cn("flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (<Link to="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-5 w-5 text-primary-foreground"/>
            </div>
            <span className="text-lg font-semibold">BuildMart</span>
          </Link>)}
        {collapsed && (<div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-primary">
            <Package className="h-5 w-5 text-primary-foreground"/>
          </div>)}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
            const isActive = pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
            return (<Link key={item.name} to={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <item.icon className="h-5 w-5 shrink-0"/>
              {!collapsed && <span>{item.name}</span>}
            </Link>);
        })}
      </nav>

      {/* Settings & Collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link to="/admin/settings" className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
          <Settings className="h-5 w-5 shrink-0"/>
          {!collapsed && <span>Cài đặt</span>}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-start px-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          {collapsed ? (<ChevronRight className="h-5 w-5"/>) : (<>
              <ChevronLeft className="h-5 w-5 mr-2"/>
              <span>Thu gọn</span>
            </>)}
        </Button>
      </div>
    </aside>);
}
