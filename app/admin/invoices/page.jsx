"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, FileText, Printer, Eye, Filter,
  Loader2, AlertCircle, CreditCard, Users, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import { InvoiceService } from "@/src/services/api-services";

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapDonHang(d) {
  const statusMap = {
    da_thanh_toan:      "completed",
    chua_thanh_toan:    "pending",
    thanh_toan_mot_phan:"partial",
    tra_mot_phan:       "partial",
  };

  return {
    id:            `HD${String(d.maDonHang).padStart(3, "0")}`,
    customerCode:  d.maKhachHang ? String(d.maKhachHang) : "--",
    customer:      d.tenKhachHang,
    createdAt:     new Date(d.ngayTao).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }),
    total:         Number(d.tongTien ?? 0),
    amountPaid:    Number(d.khachDaTra ?? 0),
    paymentMethod: d.hinhThuc ? "Chuyển khoản" : "Tiền mặt",
    status:        statusMap[d.trangThaiThanhToan] ?? "pending",
    createdBy:     d.tenNguoiTao,
    itemCount:     d.chiTietHoaDonDtos?.length ?? 0,
    chiTiet:       d.chiTietHoaDonDtos ?? [],
  };
}

const statusConfig = {
  completed: { label: "Hoàn thành",           className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending:   { label: "Chưa thanh toán",      className: "bg-destructive/10 text-destructive border-destructive/20" },
  partial:   { label: "Thanh toán một phần",  className: "bg-amber-100 text-amber-700 border-amber-200" },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("vi-VN").format(amount) + "đ";

// ─── Export Excel (với merge cell cho hóa đơn nhiều SP) ─────────────────────

/**
 * Cột 0-9   : thông tin hóa đơn (sẽ merge theo chiều dọc nếu > 1 SP)
 * Cột 10-15 : chi tiết từng sản phẩm (không merge)
 *
 * HEADERS:
 * [0]  Mã HD
 * [1]  Mã KH
 * [2]  Tên khách hàng
 * [3]  Nhân viên tạo
 * [4]  Thời gian
 * [5]  Tổng tiền (đ)
 * [6]  Đã thanh toán (đ)
 * [7]  Còn nợ (đ)
 * [8]  Phương thức TT
 * [9]  Trạng thái
 * [10] STT SP
 * [11] Tên sản phẩm
 * [12] Số lượng
 * [13] Đơn vị
 * [14] Đơn giá (đ)
 * [15] Thành tiền (đ)
 */
const HEADERS = [
  "Mã HD", "Mã KH", "Tên khách hàng", "Nhân viên tạo", "Thời gian",
  "Tổng tiền (đ)", "Đã thanh toán (đ)", "Còn nợ (đ)", "Phương thức TT", "Trạng thái",
  "STT SP", "Tên sản phẩm", "Số lượng", "Đơn vị", "Đơn giá (đ)", "Thành tiền (đ)",
];

const COL_WIDTHS = [10, 10, 24, 18, 18, 16, 18, 14, 16, 20, 8, 28, 10, 10, 16, 16];

// Chuyển số cột → chữ cái Excel (0 → A, 25 → Z, 26 → AA …)
function colLetter(n) {
  let s = "";
  n += 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellRef(col, row) {
  return `${colLetter(col)}${row}`;
}

function exportToExcel(invoices) {
  if (!invoices.length) return;

  // Bước 1: xây danh sách row dạng mảng 2D
  const aoa = [HEADERS]; // array of arrays
  const merges = [];     // danh sách vùng merge

  invoices.forEach((inv) => {
    const debt = Math.max(0, inv.total - inv.amountPaid);
    const invInfo = [
      inv.id,
      inv.customerCode,
      inv.customer,
      inv.createdBy,
      inv.createdAt,
      inv.total,
      inv.amountPaid,
      debt,
      inv.paymentMethod,
      statusConfig[inv.status].label,
    ];

    const startRow = aoa.length; // 0-based index trong aoa

    if (inv.chiTiet.length === 0) {
      aoa.push([...invInfo, "", "", "", "", "", ""]);
    } else {
      inv.chiTiet.forEach((item, idx) => {
        aoa.push([
          ...invInfo,
          idx + 1,
          item.tenSanPham,
          item.soLuong,
          item.donViTinh ?? "",
          item.donGia,
          item.thanhTien,
        ]);
      });

      // Merge cột 0-9 (thông tin HD) nếu hóa đơn có > 1 sản phẩm
      if (inv.chiTiet.length > 1) {
        const endRow = aoa.length - 1;
        // xlsx dùng row 0-based nhưng aoa[0] là header → row thực = index trong aoa
        // XLSX merge dùng {s: {r, c}, e: {r, c}} với r, c đều 0-based
        for (let col = 0; col < 10; col++) {
          merges.push({
            s: { r: startRow, c: col },
            e: { r: endRow,   c: col },
          });
        }
      }
    }
  });

  // Bước 2: tạo worksheet từ aoa
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;
  ws["!cols"]   = COL_WIDTHS.map((wch) => ({ wch }));

  // Bước 3: style header (bold, bg) — xlsx cơ bản không hỗ trợ style,
  // nhưng nếu dùng xlsx-js-style có thể thêm sau.

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoá đơn");

  const now = new Date();
  const ts  = [
    now.getDate().toString().padStart(2, "0"),
    (now.getMonth() + 1).toString().padStart(2, "0"),
    now.getFullYear(),
  ].join("");

  XLSX.writeFile(wb, `hoa-don-${ts}.xlsx`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices,        setInvoices]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [drawerOpen,      setDrawerOpen]      = useState(false);

  // Fetch
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await InvoiceService.getAll();
        setInvoices((data?.data ?? []).map(mapDonHang));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  // Filter
  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.id.toLowerCase().includes(q) ||
      inv.customer.toLowerCase().includes(q) ||
      inv.customerCode.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const {
    currentPage, totalPages, paginatedItems,
    goToPage, pageSize, setPageSize, totalItems,
  } = usePagination(filteredInvoices, 10);

  // Summary
  const totalRevenue    = invoices.filter((i) => i.status === "completed").reduce((s, i) => s + i.total, 0);
  const pendingInvoices = invoices.filter((i) => i.status === "pending").length;
  const partialInvoices = invoices.filter((i) => i.status === "partial").length;

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setDrawerOpen(true);
  };

  const handlePrintInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setDrawerOpen(true);
    setTimeout(() => window.print(), 300);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span>Đang tải dữ liệu hoá đơn...</span>
    </div>
  );

  if (error) return (
    <div className="flex h-96 flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p className="font-medium">{error}</p>
      </div>
      <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
    </div>
  );

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hoá đơn bán hàng</h1>
          <p className="text-sm text-muted-foreground">Xem và quản lý các hoá đơn bán hàng</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: FileText, label: "Tổng hoá đơn",
            value: invoices.length,
            bg: "bg-primary/10", color: "text-primary",
          },
          {
            icon: Users, label: "Chưa / Còn nợ",
            value: pendingInvoices + partialInvoices,
            bg: "bg-amber-100", color: "text-amber-700",
          },
          {
            icon: CreditCard, label: "Doanh thu",
            value: formatCurrency(totalRevenue),
            bg: "bg-emerald-100", color: "text-emerald-700",
          },
        ].map(({ icon: Icon, label, value, bg, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", bg)}>
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã HD, tên KH hoặc mã KH..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="partial">Thanh toán một phần</SelectItem>
              <SelectItem value="pending">Chưa thanh toán</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportToExcel(filteredInvoices)}
            disabled={filteredInvoices.length === 0}
          >
            <Download className="h-4 w-4" />
            Xuất Excel
            {(statusFilter !== "all" || search) && ` (${filteredInvoices.length})`}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Mã HD</TableHead>
              <TableHead className="text-center">SL SP</TableHead>
              <TableHead>Tên khách hàng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead className="text-right">Đã thanh toán</TableHead>
              <TableHead className="text-right">Còn nợ</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Không tìm thấy hoá đơn</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedItems.map((invoice) => {
              const remainingDebt = invoice.total - invoice.amountPaid;
              return (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => handleViewInvoice(invoice)}
                >
                  <TableCell className="font-semibold">{invoice.id}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {invoice.itemCount}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{invoice.customer}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {formatCurrency(invoice.amountPaid)}
                  </TableCell>
                  <TableCell className="text-right">
                    {remainingDebt > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive tabular-nums">
                        {formatCurrency(remainingDebt)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.createdAt}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      statusConfig[invoice.status].className,
                    )}>
                      {statusConfig[invoice.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => handlePrintInvoice(invoice)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Hiển thị <PageSizeSelect pageSize={pageSize} onChange={setPageSize} /> / {totalItems} hoá đơn
        </p>
        <PaginationWrapper currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* Invoice Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Chi tiết hoá đơn {selectedInvoice?.id}
            </SheetTitle>
          </SheetHeader>

          {selectedInvoice && (
            <div className="mt-6 space-y-6">

              {/* Thông tin khách hàng */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Thông tin khách hàng
                </h3>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Mã khách hàng</p>
                  <p className="font-mono text-sm font-medium">{selectedInvoice.customerCode}</p>
                  <p className="text-xs text-muted-foreground mt-3 mb-1">Tên khách hàng</p>
                  <p className="font-semibold">{selectedInvoice.customer}</p>
                </div>
              </div>

              {/* Chi tiết sản phẩm */}
              {selectedInvoice.chiTiet.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Chi tiết sản phẩm ({selectedInvoice.chiTiet.length})
                  </h3>
                  <div className="rounded-xl border bg-muted/20 divide-y text-sm">
                    {selectedInvoice.chiTiet.map((item, idx) => (
                      <div key={idx} className="p-3 space-y-1">
                        <p className="font-medium">{item.tenSanPham}</p>
                        <div className="flex justify-between text-muted-foreground">
                          <span>
                            {item.soLuong} {item.donViTinh} × {formatCurrency(item.donGia)}
                          </span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatCurrency(item.thanhTien)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chi tiết thanh toán */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Chi tiết thanh toán
                </h3>
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng tiền hàng</span>
                    <span className="font-semibold text-primary">{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Khách đã trả</span>
                    <span className="text-emerald-600 font-medium">{formatCurrency(selectedInvoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Còn nợ</span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(selectedInvoice.total - selectedInvoice.amountPaid)}
                    </span>
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
                    <span className="text-muted-foreground">Phương thức</span>
                    <span className="text-sm">{selectedInvoice.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Thông tin khác */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Thông tin khác</h3>
                <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nhân viên tạo</span>
                    <span>{selectedInvoice.createdBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thời gian tạo</span>
                    <span className="text-muted-foreground">{selectedInvoice.createdAt}</span>
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                In hoá đơn
              </Button>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}