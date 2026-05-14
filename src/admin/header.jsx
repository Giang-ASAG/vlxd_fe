"use client";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, ShoppingCart, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { clearSession, getSession } from "@/src/auth/session";
export function AdminHeader() {
    const navigate = useNavigate();
    const session = getSession();
    return (<header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 px-6 backdrop-blur">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <Input type="search" placeholder="Tim kiem san pham, khach hang..." className="pl-10 bg-secondary border-0"/>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* POS Button - Primary CTA */}
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2 px-6">
          <Link to="/pos">
            <ShoppingCart className="h-4 w-4"/>
            Bán hàng
          </Link>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5"/>
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name ?? "Admin"}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email ?? "admin@buildmart.vn"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4"/>
              Thông tin cá nhân
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => {
            clearSession();
            navigate("/login", { replace: true });
        }}>
              <LogOut className="mr-2 h-4 w-4"/>
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>);
}
