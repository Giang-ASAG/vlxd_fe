"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building2, User, Bell, Printer, Save, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
export default function SettingsPage() {
    const [storeName, setStoreName] = useState("BuildMart");
    const [storeAddress, setStoreAddress] = useState("123 Le Loi, Quan 1, TPHCM");
    const [storePhone, setStorePhone] = useState("028 1234 5678");
    const [taxId, setTaxId] = useState("0123456789");
    const [enableNotifications, setEnableNotifications] = useState(true);
    const [enableSound, setEnableSound] = useState(true);
    const [autoPrint, setAutoPrint] = useState(false);
    const handleSave = () => {
        alert("Da luu cai dat!");
    };
    return (<div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cai dat</h1>
        <p className="text-muted-foreground">Quan ly cai dat he thong</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Store Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5"/>
              Thong tin cua hang
            </CardTitle>
            <CardDescription>Cai dat thong tin co ban cua cua hang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Ten cua hang</Label>
              <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress">Dia chi</Label>
              <Input id="storeAddress" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePhone">So dien thoai</Label>
              <Input id="storePhone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Ma so thue</Label>
              <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)}/>
            </div>
          </CardContent>
        </Card>

        {/* User Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5"/>
              Tai khoan
            </CardTitle>
            <CardDescription>Quan ly thong tin tai khoan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Ten hien thi</Label>
              <Input id="userName" defaultValue="Admin"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input id="userEmail" type="email" defaultValue="admin@buildmart.vn"/>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mat khau hien tai</Label>
              <Input id="currentPassword" type="password"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mat khau moi</Label>
              <Input id="newPassword" type="password"/>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5"/>
              Thong bao
            </CardTitle>
            <CardDescription>Cai dat thong bao he thong</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Thong bao push</Label>
                <p className="text-sm text-muted-foreground">
                  Nhan thong bao khi co don hang moi
                </p>
              </div>
              <Switch checked={enableNotifications} onCheckedChange={setEnableNotifications}/>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Am thanh</Label>
                <p className="text-sm text-muted-foreground">
                  Phat am thanh khi them san pham vao gio hang
                </p>
              </div>
              <Switch checked={enableSound} onCheckedChange={setEnableSound}/>
            </div>
          </CardContent>
        </Card>

        {/* Printer Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5"/>
              May in
            </CardTitle>
            <CardDescription>Cai dat may in hoa don</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tu dong in hoa don</Label>
                <p className="text-sm text-muted-foreground">
                  Tu dong in hoa don sau khi thanh toan
                </p>
              </div>
              <Switch checked={autoPrint} onCheckedChange={setAutoPrint}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="printerName">May in mac dinh</Label>
              <Input id="printerName" defaultValue="EPSON TM-T82" disabled/>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin">
            <LayoutDashboard className="h-4 w-4"/>
            Ve dashboard
          </Link>
        </Button>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4"/>
          Luu cai dat
        </Button>
      </div>
    </div>);
}
