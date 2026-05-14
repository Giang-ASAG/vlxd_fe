"use client";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, FileText, Printer, Eye, Calendar, Filter, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";

function mapDonHang(d) {
  const statusMap = {
    da_thanh_toan: "completed",
    chua_thanh_toan: "pending",
    thanh_toan_mot_phan: "partial",
    tra_mot_phan: "partial",
  };

  const tongTienHang = Number(d.tongTien ?? 0);
  const khachDaTra = Number(d.khachDaTra ?? 0);

  return {
    id: `HD${String(d.maDonHang).padStart(3, "0")}`,
    customerCode: d.maKhachHang ? String(d.maKhachHang) : "--",
    customer: d.tenKhachHang,
    createdAt: new Date(d.ngayTao).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    total: tongTienHang,
    amountPaid: khachDaTra,
    paymentMethod: d.hinhThuc ? "Chuyển khoản" : "Tiền mặt",
    status: statusMap[d.trangThaiThanhToan] ?? "pending",
    createdBy: d.tenNguoiTao,
  };
}

const statusConfig = {
  completed: { label: "Hoàn thành",          className: "bg-success/10 text-success border-success/20" },
  pending:   { label: "Chưa thanh toán",     className: "bg-destructive/10 text-destructive border-destructive/20" },
  partial:   { label: "Thanh toán một phần", className: "bg-warning/10 text-warning-foreground border-warning/20" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await fetch("https://vlxdbe-production.up.railway.app/api/DonHangs/HoaDon");
        if (!res.ok) throw new Error(`Lỗi ${res.status}: ${res.statusText}`);
        const json = await res.json();
        if (!json.success) throw new Error("API trả về lỗi");
        setInvoices(json.data.map(mapDonHang));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.id.toLowerCase().includes(search.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(search.toLowerCase()) ||
      invoice.customerCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    pageSize,
    setPageSize,
    totalItems,
    rangeStart,
    rangeEnd,
  } = usePagination(filteredInvoices, 10);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setDrawerOpen(true);
  };

  const totalRevenue    = invoices.filter((i) => i.status === "completed").reduce((s, i) => s + i.total, 0);
  const pendingInvoices = invoices.filter((i) => i.status === "pending").length;
  const partialInvoices = invoices.filter((i) => i.status === "partial").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý hoá đơn</h1>
        <p className="text-muted-foreground">Xem và quản lý các hoá đơn bán hàng</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng hoá đơn</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chưa / Còn nợ</p>
                <p className="text-2xl font-bold">{pendingInvoices + partialInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm hoá đơn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="partial">Thanh toán một phần</SelectItem>
              <SelectItem value="pending">Chưa thanh toán</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã HD</TableHead>
              <TableHead>Mã khách hàng</TableHead>
              <TableHead>Tên khách hàng</TableHead>
              <TableHead className="text-right">Tổng tiền hàng</TableHead>
              <TableHead className="text-right">Khách đã trả</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Đang tải dữ liệu...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>Không tìm thấy hoá đơn</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
                paginatedItems.map((invoice) => {
                 return (
                   <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                     <TableCell className="font-medium">{invoice.id}</TableCell>
                     <TableCell>{invoice.customerCode}</TableCell>
                     <TableCell>
                       <p className="font-medium">{invoice.customer}</p>
                     </TableCell>
                     <TableCell className="text-right font-semibold">
                       {formatCurrency(invoice.total)}
                     </TableCell>
                     <TableCell className="text-right font-medium">
                       {formatCurrency(invoice.amountPaid)}
                     </TableCell>
                     <TableCell className="text-muted-foreground">{invoice.createdAt}</TableCell>
                     <TableCell>
                       <div className="flex gap-1">
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8"
                           onClick={() => handleViewInvoice(invoice)}
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8"
                           onClick={() => window.print()}
                         >
                           <Printer className="h-4 w-4" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 );
               })
             )}
           </TableBody>
         </Table>
       </div>

       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
         {!loading && !error && (
           <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
             <span>Hiển thị</span>
             <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
             <span>/ {totalItems} hoá đơn</span>
           </p>
         )}
         <PaginationWrapper
           currentPage={currentPage}
           totalPages={totalPages}
           onPageChange={goToPage}
         />
       </div>

      {/* Invoice Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Chi tiết hoá đơn {selectedInvoice?.id}</SheetTitle>
          </SheetHeader>
          {selectedInvoice && (
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Thông tin khách hàng</h3>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Mã khách hàng: {selectedInvoice.customerCode}</p>
                  <p className="font-medium">{selectedInvoice.customer}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng tiền hàng</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(selectedInvoice.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Khách đã trả</span>
                  <span>{formatCurrency(selectedInvoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusConfig[selectedInvoice.status].className)}
                  >
                    {statusConfig[selectedInvoice.status].label}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nhân viên</span>
                  <span>{selectedInvoice.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thời gian</span>
                  <span>{selectedInvoice.createdAt}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  In hoá đơn
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
