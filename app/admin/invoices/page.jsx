"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle, ChevronDown, Copy, Download, Edit3, FileText,
  Filter, Loader2, MoreHorizontal, Plus, Printer, Search, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { usePagination } from "@/src/hooks/use-pagination";
import { InvoiceService } from "@/src/services/api-services";

const statusConfig = {
  completed: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { label: "Chưa thanh toán", className: "bg-destructive/10 text-destructive border-destructive/20" },
  partial: { label: "Thanh toán một phần", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(amount) {
  return `${new Intl.NumberFormat("vi-VN").format(toNumber(amount))}đ`;
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function mapDonHang(order) {
  const statusMap = {
    da_thanh_toan: "completed",
    chua_thanh_toan: "pending",
    thanh_toan_mot_phan: "partial",
    tra_mot_phan: "partial",
  };
  const details = order?.chiTietHoaDonDtos ?? order?.chiTiet ?? [];
  const total = toNumber(order?.tongTien);
  const paid = toNumber(order?.khachDaTra);
  const id = order?.maDonHang ?? order?.id ?? "";

  return {
    raw: order,
    id: String(id),
    code: id ? `HD${String(id).padStart(6, "0")}` : "--",
    returnCode: order?.maTraHang ? `TH${String(order.maTraHang).padStart(6, "0")}` : "",
    customerCode: order?.maKhachHang ? `KH${String(order.maKhachHang).padStart(6, "0")}` : "--",
    customer: order?.tenKhachHang || "Khách lẻ",
    phone: order?.soDienThoai ?? order?.sdt ?? "",
    address: order?.diaChi ?? order?.diaChiGiaoHang ?? "",
    createdAt: order?.ngayTao,
    createdAtLabel: formatDateTime(order?.ngayTao),
    total,
    discount: toNumber(order?.giamGia ?? order?.giamGiaHoaDon),
    paid,
    debt: Math.max(0, total - paid),
    status: statusMap[order?.trangThaiThanhToan] ?? (paid >= total ? "completed" : paid > 0 ? "partial" : "pending"),
    createdBy: order?.tenNguoiTao ?? order?.tenNguoiBan ?? "--",
    seller: order?.tenNguoiBan ?? order?.tenNguoiTao ?? "--",
    channel: order?.kenhBan ?? "Bán trực tiếp",
    priceBook: order?.bangGia ?? "Bảng giá chung",
    paymentMethod: order?.hinhThuc ? "Chuyển khoản" : "Tiền mặt",
    details,
  };
}

function itemName(item) {
  return item?.tenSanPham ?? item?.tenHangHoa ?? item?.productName ?? "--";
}

function itemCode(item) {
  return item?.maSku ?? item?.sku ?? item?.maSanPham ?? "--";
}

function itemQty(item) {
  return toNumber(item?.soLuong ?? item?.quantity);
}

function itemUnitPrice(item) {
  return toNumber(item?.donGia ?? item?.giaBan ?? item?.unitPrice);
}

function itemTotal(item) {
  return toNumber(item?.thanhTien ?? item?.total) || itemQty(item) * itemUnitPrice(item);
}

function exportToExcel(invoices) {
  if (!invoices.length) return;

  const rows = invoices.flatMap((invoice) => {
    if (!invoice.details.length) {
      return [{
        "Mã hóa đơn": invoice.code,
        "Thời gian": invoice.createdAtLabel,
        "Mã KH": invoice.customerCode,
        "Khách hàng": invoice.customer,
        "Tổng tiền hàng": invoice.total,
        "Giảm giá": invoice.discount,
        "Khách đã trả": invoice.paid,
        "Trạng thái": statusConfig[invoice.status].label,
      }];
    }

    return invoice.details.map((item, index) => ({
      "Mã hóa đơn": invoice.code,
      "Thời gian": invoice.createdAtLabel,
      "Mã KH": invoice.customerCode,
      "Khách hàng": invoice.customer,
      "STT SP": index + 1,
      "Mã hàng": itemCode(item),
      "Tên hàng": itemName(item),
      "Số lượng": itemQty(item),
      "Đơn giá": itemUnitPrice(item),
      "Thành tiền": itemTotal(item),
      "Tổng tiền hàng": invoice.total,
      "Giảm giá": invoice.discount,
      "Khách đã trả": invoice.paid,
      "Trạng thái": statusConfig[invoice.status].label,
    }));
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoa don");
  XLSX.writeFile(wb, "hoa-don.xlsx");
}

function InvoiceDetail({ invoice }) {
  return (
    <TableRow className="bg-background hover:bg-background">
      <TableCell colSpan={9} className="border-x border-b border-primary/30 p-0">
        <div className="space-y-5 px-6 py-5">
          <div className="border-b">
            <div className="flex gap-8">
              <button className="border-b-2 border-primary px-1 pb-3 text-sm font-semibold text-primary">Thông tin</button>
              <button className="px-1 pb-3 text-sm font-semibold text-muted-foreground">Lịch sử thanh toán</button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-bold">{invoice.customer}</span>
                <span className="font-mono text-sm text-muted-foreground">{invoice.code}</span>
                <Badge variant="outline" className={cn("border", statusConfig[invoice.status].className)}>
                  {statusConfig[invoice.status].label}
                </Badge>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Người tạo</p>
                  <p className="font-medium">{invoice.createdBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Người bán</p>
                  <p className="font-medium">{invoice.seller}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ngày bán</p>
                  <p className="font-medium">{invoice.createdAtLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kênh bán</p>
                  <p className="font-medium">{invoice.channel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bảng giá</p>
                  <p className="font-medium">{invoice.priceBook}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Thanh toán</p>
                  <p className="font-medium">{invoice.paymentMethod}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">Chi nhánh trung tâm</p>
              <p className="mt-2 text-xs text-muted-foreground">{invoice.customerCode}</p>
              {invoice.phone && <p className="text-xs text-muted-foreground">{invoice.phone}</p>}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Mã hàng</TableHead>
                  <TableHead>Tên hàng</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Giảm giá</TableHead>
                  <TableHead className="text-right">Giá bán</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">Hóa đơn chưa có chi tiết sản phẩm</TableCell>
                  </TableRow>
                ) : invoice.details.map((item, index) => (
                  <TableRow key={`${invoice.code}-${index}`}>
                    <TableCell className="font-mono text-xs text-primary">{itemCode(item)}</TableCell>
                    <TableCell className="max-w-[420px] font-medium">{itemName(item)}</TableCell>
                    <TableCell className="text-right tabular-nums">{itemQty(item)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(itemUnitPrice(item))}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item?.giamGia)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(itemUnitPrice(item))}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(itemTotal(item))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {invoice.address && (
            <p className="text-sm text-muted-foreground">Địa chỉ mới: {invoice.address}</p>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-wrap items-center gap-2 self-end">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"><Trash2 className="h-4 w-4" /> Hủy</Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"><Copy className="h-4 w-4" /> Sao chép</Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => exportToExcel([invoice])}><Download className="h-4 w-4" /> Xuất file</Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng tiền hàng ({invoice.details.reduce((s, item) => s + itemQty(item), 0)})</span>
                <span className="font-semibold tabular-nums">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giảm giá hóa đơn</span>
                <span className="tabular-nums">{formatCurrency(invoice.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Khách cần trả</span>
                <span className="font-semibold tabular-nums">{formatCurrency(invoice.total - invoice.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Khách đã trả</span>
                <span className="font-semibold text-primary tabular-nums">{formatCurrency(invoice.paid)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" /> In</Button>
            <Button className="gap-2"><Edit3 className="h-4 w-4" /> Chỉnh sửa</Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await InvoiceService.getAll();
        const mapped = (data?.data ?? []).map(mapDonHang);
        setInvoices(mapped);
        if (mapped.length > 0) setExpandedId(mapped[0].id);
      } catch (err) {
        setError(err?.message ?? "Không thể tải dữ liệu hóa đơn");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch = !q ||
        invoice.code.toLowerCase().includes(q) ||
        invoice.customer.toLowerCase().includes(q) ||
        invoice.customerCode.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const {
    currentPage, totalPages, paginatedItems, goToPage, pageSize, setPageSize, totalItems,
  } = usePagination(filteredInvoices, 10);

  const totals = useMemo(() => ({
    amount: filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    discount: filteredInvoices.reduce((sum, invoice) => sum + invoice.discount, 0),
    paid: filteredInvoices.reduce((sum, invoice) => sum + invoice.paid, 0),
  }), [filteredInvoices]);

  if (loading) return (
    <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span>Đang tải dữ liệu hóa đơn...</span>
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý hóa đơn</h1>
          <p className="text-sm text-muted-foreground">Xem danh sách hóa đơn, chi tiết sản phẩm và lịch sử thanh toán.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Tạo mới</Button>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Import file</Button>
          <Button variant="outline" className="gap-2" onClick={() => exportToExcel(filteredInvoices)} disabled={!filteredInvoices.length}>
            <Download className="h-4 w-4" /> Xuất file
          </Button>
          <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Theo mã hóa đơn, tên khách hàng hoặc mã KH..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-[220px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="partial">Thanh toán một phần</SelectItem>
            <SelectItem value="pending">Chưa thanh toán</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-rose-100 hover:bg-rose-100">
              <TableHead className="w-12"></TableHead>
              <TableHead>Mã hóa đơn</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Mã trả hàng</TableHead>
              <TableHead>Mã KH</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Tổng tiền hàng</TableHead>
              <TableHead className="text-right">Giảm giá</TableHead>
              <TableHead className="text-right">Khách đã trả</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/20 font-semibold">
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(totals.amount)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(totals.discount)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(totals.paid)}</TableCell>
            </TableRow>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-36 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Không tìm thấy hóa đơn</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedItems.map((invoice) => (
              <Fragment key={invoice.code}>
                <TableRow
                  className={cn("cursor-pointer hover:bg-muted/40", expandedId === invoice.id && "bg-primary/5 hover:bg-primary/5")}
                  onClick={() => setExpandedId((id) => id === invoice.id ? null : invoice.id)}
                >
                  <TableCell><ChevronDown className={cn("h-4 w-4 transition-transform", expandedId === invoice.id && "rotate-180")} /></TableCell>
                  <TableCell className="font-semibold">{invoice.code}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.createdAtLabel}</TableCell>
                  <TableCell>{invoice.returnCode || "--"}</TableCell>
                  <TableCell className="font-mono text-xs">{invoice.customerCode}</TableCell>
                  <TableCell className="font-medium">{invoice.customer}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(invoice.discount)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(invoice.paid)}</TableCell>
                </TableRow>
                {expandedId === invoice.id && <InvoiceDetail invoice={invoice} />}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Hiển thị <PageSizeSelect pageSize={pageSize} onChange={setPageSize} /> / {totalItems} hóa đơn
        </p>
        <PaginationWrapper currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </div>
  );
}
