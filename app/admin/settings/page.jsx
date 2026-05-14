"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, User, Bell, Printer, Save, LayoutDashboard, 
  Settings, Store, Phone, MapPin, CreditCard, Volume2, 
  PrinterCheck, CheckCircle2 
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("BuildMart");
  const [storeAddress, setStoreAddress] = useState("123 Lê Lợi, Quận 1, TP.HCM");
  const [storePhone, setStorePhone] = useState("028 1234 5678");
  const [taxId, setTaxId] = useState("0123456789");
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableSound, setEnableSound] = useState(true);
  const [autoPrint, setAutoPrint] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    alert("Đã lưu cài đặt!");
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
            <p className="text-sm text-muted-foreground">Quản lý cài đặt hệ thống</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Store Information */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              Thông tin cửa hàng
            </CardTitle>
            <CardDescription>Cài đặt thông tin cơ bản của cửa hàng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="flex items-center gap-2">
                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                Tên cửa hàng
              </Label>
              <Input 
                id="storeName" 
                value={storeName} 
                onChange={(e) => setStoreName(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress" className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Địa chỉ
              </Label>
              <Input 
                id="storeAddress" 
                value={storeAddress} 
                onChange={(e) => setStoreAddress(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePhone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Số điện thoại
              </Label>
              <Input 
                id="storePhone" 
                value={storePhone} 
                onChange={(e) => setStorePhone(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId" className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Mã số thuế
              </Label>
              <Input 
                id="taxId" 
                value={taxId} 
                onChange={(e) => setTaxId(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* User Settings */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              Tài khoản
            </CardTitle>
            <CardDescription>Quản lý thông tin tài khoản</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="userName">Tên hiển thị</Label>
              <Input id="userName" defaultValue="Admin" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input 
                id="userEmail" 
                type="email" 
                defaultValue="admin@buildmart.vn" 
                className="rounded-lg"
              />
            </div>
            <Separator className="my-2" />
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <Input id="currentPassword" type="password" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input id="newPassword" type="password" className="rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              Thông báo
            </CardTitle>
            <CardDescription>Cài đặt thông báo hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Thông báo push</Label>
                <p className="text-xs text-muted-foreground">
                  Nhận thông báo khi có đơn hàng mới
                </p>
              </div>
              <Switch 
                checked={enableNotifications} 
                onCheckedChange={setEnableNotifications}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Âm thanh
                </Label>
                <p className="text-xs text-muted-foreground">
                  Phát âm thanh khi thêm sản phẩm vào giỏ hàng
                </p>
              </div>
              <Switch 
                checked={enableSound} 
                onCheckedChange={setEnableSound}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Printer Settings */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Printer className="h-4 w-4 text-primary" />
              </div>
              Máy in
            </CardTitle>
            <CardDescription>Cài đặt máy in hóa đơn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <PrinterCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Tự động in hóa đơn
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tự động in hóa đơn sau khi thanh toán
                </p>
              </div>
              <Switch 
                checked={autoPrint} 
                onCheckedChange={setAutoPrint}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printerName">Máy in mặc định</Label>
              <Input 
                id="printerName" 
                defaultValue="EPSON TM-T82" 
                disabled 
                className="rounded-lg bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Kết nối qua cổng USB hoặc mạng LAN
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 border-t -mt-2">
        <Button asChild variant="outline" className="gap-2 rounded-lg">
          <Link to="/admin">
            <LayoutDashboard className="h-4 w-4" />
            Về dashboard
          </Link>
        </Button>
        <Button 
          onClick={handleSave} 
          className={cn(
            "gap-2 rounded-lg transition-all duration-300",
            saved && "bg-emerald-600 hover:bg-emerald-600"
          )}
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Đã lưu
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Lưu cài đặt
            </>
          )}
        </Button>
      </div>
    </div>
  );
}