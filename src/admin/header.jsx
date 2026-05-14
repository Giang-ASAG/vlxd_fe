"use client";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, ShoppingCart, User, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { clearSession, getSession } from "@/src/auth/session";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AdminHeader({ sidebarOpen, onSidebarToggle }) {
    const navigate = useNavigate();
    const session = getSession();
    const [searchFocused, setSearchFocused] = useState(false);

    // Lấy thông tin user
    const userName = session?.user?.name ?? "Admin";
    const userEmail = session?.user?.email ?? "admin@buildmart.vn";
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm shadow-sm lg:px-6">
            {/* Left section - Menu button & Logo */}
            <div className="flex items-center gap-3">
                {onSidebarToggle && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSidebarToggle}
                        className="lg:hidden h-9 w-9 rounded-lg hover:bg-muted"
                    >
                        {sidebarOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                )}
                <Link to="/admin" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <span className="text-sm font-bold text-primary-foreground">BM</span>
                    </div>
                    <span className="hidden font-semibold text-foreground md:inline-block">
                        BuildMart
                    </span>
                </Link>
            </div>

            {/* Search - Centered */}
            <div className={cn(
                "hidden md:block flex-1 max-w-md transition-all duration-200",
                searchFocused && "max-w-lg"
            )}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm kiếm sản phẩm, đơn hàng, khách hàng..."
                        className="pl-10 bg-muted/50 border-muted focus:bg-background transition-colors"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Mobile search button */}
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-lg">
                    <Search className="h-5 w-5" />
                </Button>

                {/* POS Button */}
                <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2 shadow-sm">
                    <Link to="/pos">
                        <ShoppingCart className="h-4 w-4" />
                        <span className="hidden sm:inline">Bán hàng</span>
                    </Link>
                </Button>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg hover:bg-muted">
                            <Bell className="h-5 w-5" />
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground ring-2 ring-background">
                                3
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="flex items-center justify-between">
                            <span>Thông báo</span>
                            <Badge variant="secondary" className="text-xs">3 mới</Badge>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="max-h-80 overflow-y-auto">
                            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                                <p className="text-sm font-medium">Đơn hàng mới #HD001</p>
                                <p className="text-xs text-muted-foreground">Khách hàng Nguyễn Văn A vừa đặt hàng</p>
                                <p className="text-xs text-muted-foreground">5 phút trước</p>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                                <p className="text-sm font-medium">Sản phẩm sắp hết hàng</p>
                                <p className="text-xs text-muted-foreground">Còn 5 sản phẩm dưới tồn kho tối thiểu</p>
                                <p className="text-xs text-muted-foreground">1 giờ trước</p>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                                <p className="text-sm font-medium">Thanh toán công nợ</p>
                                <p className="text-xs text-muted-foreground">Nhà cung cấp A đã xác nhận thanh toán</p>
                                <p className="text-xs text-muted-foreground">2 giờ trước</p>
                            </DropdownMenuItem>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="justify-center text-center text-primary">
                            Xem tất cả
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-muted">
                            <Avatar className="h-9 w-9 ring-2 ring-muted transition-all hover:ring-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-semibold">{userName}</p>
                                <p className="text-xs text-muted-foreground">{userEmail}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer gap-3 py-2.5">
                            <User className="h-4 w-4" />
                            <span>Thông tin cá nhân</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer gap-3 py-2.5">
                            <ShoppingCart className="h-4 w-4" />
                            <span>Đơn hàng của tôi</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="cursor-pointer gap-3 py-2.5 text-destructive focus:text-destructive"
                            onClick={() => {
                                clearSession();
                                navigate("/login", { replace: true });
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Đăng xuất</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}