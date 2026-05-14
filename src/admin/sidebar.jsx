"use client";

import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Package, Users, FileText, Truck, BarChart3, 
  Settings, ChevronLeft, ChevronRight, Store, LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { clearSession } from "@/src/auth/session";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border",
        "transition-all duration-300 ease-in-out shadow-sm overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md flex-shrink-0">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent transition-opacity duration-200">
              BuildMart
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  isActive && "text-primary",
                  !isActive && "group-hover:scale-105"
                )} 
              />
              
              <span
                className={cn(
                  "transition-all duration-200 whitespace-nowrap overflow-hidden",
                  collapsed 
                    ? "w-0 opacity-0 translate-x-[-10px]" 
                    : "w-auto opacity-100 translate-x-0"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border p-3 space-y-1 mt-auto">
        {/* Settings */}
        <Link
          to="/admin/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span
            className={cn(
              "transition-all duration-200 whitespace-nowrap overflow-hidden",
              collapsed ? "w-0 opacity-0 translate-x-[-10px]" : "w-auto opacity-100 translate-x-0"
            )}
          >
            Cài đặt
          </span>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span
            className={cn(
              "transition-all duration-200 whitespace-nowrap overflow-hidden",
              collapsed ? "w-0 opacity-0 translate-x-[-10px]" : "w-auto opacity-100 translate-x-0"
            )}
          >
            Đăng xuất
          </span>
        </button>

        {/* Collapse Button */}

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-start px-3 mt-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200",
            collapsed ? "justify-center" : ""
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 mr-2" />
              <span>Thu gọn</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}