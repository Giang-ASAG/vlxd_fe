"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CalendarDays, ChevronDown, Download, Eye, FilePlus2,
  Loader2, PackagePlus, Plus, Save, Search, Trash2, Truck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { getSession } from "@/src/auth/session";
import { usePagination } from "@/src/hooks/use-pagination";
import {
  ProductService, PurchaseOrderService, SupplierService,
} from "@/src/services/api-services";

const EMPTY_LINE = { productId: "", productName: "", quantity: 1, unitPrice: 0, discount: 0, unit: "" };

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(toNumber(value))}đ`;
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getLines(order) {
  const keys = [
    "chiTietPhieuNhapDtos", "chiTietPhieuNhap", "chiTietPhieuNhaps",
    "sanPhamDtos", "danhSachChiTiet", "details", "items", "sanPhams",
  ];
  for (const key of keys) {
    if (Array.isArray(order?.[key])) return order[key];
  }
  return [];
}

function getLineTotal(line) {
  const total = line?.thanhTien ?? line?.tongTien ?? line?.total;
  if (total != null) return toNumber(total);
  return toNumber(line?.soLuongNhap ?? line?.soLuong ?? line?.quantity) * toNumber(line?.donGiaNhap ?? line?.giaNhap ?? line?.donGia ?? line?.unitPrice);
}

function mapPurchaseOrder(order) {
  const id = order?.maPhieuNhap ?? order?.maPhieu ?? order?.id ?? "";
  const lines = getLines(order);
  const total = toNumber(order?.tongTienNhap ?? order?.tongTien ?? order?.canTraNcc ?? order?.canTraNCC) ||
    lines.reduce((sum, line) => sum + getLineTotal(line), 0);
  const paid = toNumber(order?.soTienThanhToanNgay ?? order?.daTraNcc ?? order?.daTraNCC ?? order?.daThanhToan);

  return {
    raw: order,
    id: String(id || ""),
    code: id ? `PN${String(id).padStart(5, "0")}` : order?.maPhieuNhapText ?? "--",
    supplierId: String(order?.maNcc ?? order?.maNhaCungCap ?? order?.maNccId ?? ""),
    supplierName: order?.tenNcc ?? order?.tenNhaCungCap ?? order?.nhaCungCap ?? "--",
    createdBy: order?.tenNguoiNhap ?? order?.tenNguoiLap ?? order?.nguoiNhap ?? "--",
    branch: order?.tenKhoNhap ?? order?.tenKho ?? "Chi nhánh trung tâm",
    createdAt: order?.ngayNhap ?? order?.ngayTao ?? order?.createdAt,
    status: order?.trangThaiNhapHang ?? order?.trangThai ?? "Đã nhập hàng",
    total,
    paid,
    debt: Math.max(0, toNumber(order?.soTienNo ?? order?.conNo ?? total - paid)),
    lines,
  };
}

function lineProductName(line) {
  return line?.tenSanPham ?? line?.tenHangHoa ?? line?.productName ?? line?.name ?? "--";
}

function lineProductCode(line) {
  return line?.maSku ?? line?.sku ?? line?.maSanPham ?? line?.productId ?? "--";
}

function statusClass(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("chờ") || text.includes("tam") || text.includes("tạm")) return "bg-amber-100 text-amber-700 border-amber-200";
  if (text.includes("hủy")) return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function getUserId() {
  const id = Number(getSession()?.user?.sub);
  return Number.isFinite(id) && id > 0 ? id : 1;
}

function PurchaseOrderDetail({ order }) {
  const lines = order.lines;

  return (
    <TableRow className="bg-background hover:bg-background">
      <TableCell colSpan={8} className="border-x border-b border-primary/30 p-0">
        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold">{order.code}</span>
                <Badge variant="outline" className={cn("border", statusClass(order.status))}>{order.status}</Badge>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Người nhập</p>
                  <p className="font-medium">{order.createdBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ngày nhập</p>
                  <p className="font-medium">{formatDateTime(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nhà cung cấp</p>
                  <p className="font-medium text-primary">{order.supplierName}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{order.branch}</p>
              <p className="mt-1 text-xs text-muted-foreground">Số lượng mặt hàng: {lines.length}</p>
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
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">Phiếu nhập chưa có chi tiết sản phẩm</TableCell>
                  </TableRow>
                ) : lines.map((line, index) => (
                  <TableRow key={`${order.code}-${index}`}>
                    <TableCell className="font-mono text-xs text-primary">{lineProductCode(line)}</TableCell>
                    <TableCell className="max-w-[360px] font-medium">{lineProductName(line)}</TableCell>
                    <TableCell className="text-right tabular-nums">{toNumber(line?.soLuongNhap ?? line?.soLuong ?? line?.quantity)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(line?.donGiaNhap ?? line?.giaNhap ?? line?.donGia ?? line?.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(line?.giamGia ?? line?.discount)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(getLineTotal(line))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="ml-auto grid max-w-sm gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng tiền hàng</span>
              <span className="font-semibold tabular-nums">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Đã trả NCC</span>
              <span className="tabular-nums">{formatCurrency(order.paid)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-semibold">Cần trả NCC</span>
              <span className="font-bold text-primary tabular-nums">{formatCurrency(order.debt || order.total - order.paid)}</span>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState({
    supplierId: "", receiptCode: "", paidNow: 0, note: "", lines: [{ ...EMPTY_LINE }],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderRes, supplierRes, productRes] = await Promise.all([
        PurchaseOrderService.getAll(),
        SupplierService.getAll(),
        ProductService.getAll(),
      ]);
      const mappedOrders = (orderRes?.data ?? []).map(mapPurchaseOrder);
      setOrders(mappedOrders);
      setSuppliers(supplierRes?.data ?? []);
      setProducts(productRes?.data ?? []);
      if (!expandedId && mappedOrders.length > 0) setExpandedId(mappedOrders[0].id);
    } catch (err) {
      setError(err?.message ?? "Không thể tải dữ liệu nhập hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !q ||
        order.code.toLowerCase().includes(q) ||
        order.supplierName.toLowerCase().includes(q) ||
        order.supplierId.toLowerCase().includes(q);
      const matchesSupplier = supplierFilter === "all" || order.supplierId === supplierFilter;
      return matchesSearch && matchesSupplier;
    });
  }, [orders, search, supplierFilter]);

  const {
    currentPage, totalPages, paginatedItems, goToPage, pageSize, setPageSize, totalItems,
  } = usePagination(filteredOrders, 10);

  const stats = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    const debt = orders.reduce((sum, order) => sum + (order.debt || Math.max(0, order.total - order.paid)), 0);
    const items = orders.reduce((sum, order) => sum + order.lines.length, 0);
    return { total, debt, items };
  }, [orders]);

  const updateLine = (index, field, value) => {
    setDraft((prev) => {
      const lines = prev.lines.map((line, i) => i === index ? { ...line, [field]: value } : line);
      return { ...prev, lines };
    });
  };

  const chooseProduct = (index, productId) => {
    const product = products.find((p) => String(p.maSanPham ?? p.id) === String(productId));
    updateLine(index, "productId", productId);
    if (product) {
      setDraft((prev) => {
        const lines = prev.lines.map((line, i) => i === index ? {
          ...line,
          productId,
          productName: product.tenSanPham ?? product.name ?? "",
          unitPrice: toNumber(product.giaNhapGanNhat ?? product.cost),
          unit: product.donViChinh ?? product.unit ?? "",
        } : line);
        return { ...prev, lines };
      });
    }
  };

  const draftTotal = draft.lines.reduce((sum, line) =>
    sum + Math.max(0, toNumber(line.quantity) * toNumber(line.unitPrice) - toNumber(line.discount)), 0);

  const handleExport = () => {
    const rows = filteredOrders.map((order) => ({
      "Mã nhập hàng": order.code,
      "Thời gian": formatDateTime(order.createdAt),
      "Mã NCC": order.supplierId,
      "Nhà cung cấp": order.supplierName,
      "Tổng nhập": order.total,
      "Đã trả": order.paid,
      "Cần trả NCC": order.debt,
      "Trạng thái": order.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nhap hang");
    XLSX.writeFile(wb, "nhap-hang.xlsx");
  };

  const handleSave = async () => {
    if (!draft.supplierId) {
      setError("Vui lòng chọn nhà cung cấp trước khi lưu phiếu nhập.");
      return;
    }
    const validLines = draft.lines.filter((line) => line.productId && toNumber(line.quantity) > 0);
    if (validLines.length === 0) {
      setError("Vui lòng chọn ít nhất một sản phẩm và nhập số lượng.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await PurchaseOrderService.create({
        maNcc: Number(draft.supplierId),
        maNhaCungCap: Number(draft.supplierId),
        maNguoiNhap: getUserId(),
        maNguoiDung: getUserId(),
        maKho: 1,
        ngayNhap: new Date().toISOString(),
        ghiChu: draft.note,
        soTienThanhToanNgay: toNumber(draft.paidNow),
        chiTietPhieuNhapDtos: validLines.map((line) => ({
          maSanPham: Number(line.productId),
          soLuongNhap: toNumber(line.quantity),
          soLuong: toNumber(line.quantity),
          donGiaNhap: toNumber(line.unitPrice),
          giaNhap: toNumber(line.unitPrice),
          giamGia: toNumber(line.discount),
        })),
      });
      setDraft({ supplierId: "", receiptCode: "", paidNow: 0, note: "", lines: [{ ...EMPTY_LINE }] });
      setDraftOpen(false);
      await loadData();
    } catch (err) {
      setError(err?.message ?? "Không thể lưu phiếu nhập.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span>Đang tải dữ liệu nhập hàng...</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý nhập hàng</h1>
          <p className="text-sm text-muted-foreground">Theo dõi phiếu nhập, công nợ nhà cung cấp và chi tiết hàng nhập.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!filteredOrders.length}>
            <Download className="h-4 w-4" /> Xuất file
          </Button>
          <Button className="gap-2" onClick={() => setDraftOpen((v) => !v)}>
            <Plus className="h-4 w-4" /> Nhập hàng
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-lg shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><PackagePlus className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Phiếu nhập</p><p className="text-xl font-bold">{orders.length}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><CalendarDays className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Tổng tiền nhập</p><p className="text-xl font-bold">{formatCurrency(stats.total)}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Truck className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Cần trả NCC</p><p className="text-xl font-bold">{formatCurrency(stats.debt)}</p></div>
          </CardContent>
        </Card>
      </div>

      {draftOpen && (
        <div className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Tạo phiếu nhập mới</h2>
                <p className="text-xs text-muted-foreground">Chọn nhà cung cấp, thêm sản phẩm và hoàn thành phiếu nhập.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setDraft((p) => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }))}>
                <FilePlus2 className="h-4 w-4" /> Thêm dòng
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-rose-50 hover:bg-rose-50">
                    <TableHead className="min-w-[260px]">Tên hàng</TableHead>
                    <TableHead className="w-28 text-right">Số lượng</TableHead>
                    <TableHead className="w-36 text-right">Đơn giá</TableHead>
                    <TableHead className="w-32 text-right">Giảm giá</TableHead>
                    <TableHead className="w-36 text-right">Thành tiền</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select value={String(line.productId)} onValueChange={(value) => chooseProduct(index, value)}>
                          <SelectTrigger><SelectValue placeholder="Tìm/chọn hàng hóa" /></SelectTrigger>
                          <SelectContent>
                            {products.map((product) => {
                              const id = String(product.maSanPham ?? product.id);
                              return <SelectItem key={id} value={id}>{product.tenSanPham ?? product.name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input className="text-right" type="number" min="0" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} /></TableCell>
                      <TableCell><Input className="text-right" type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} /></TableCell>
                      <TableCell><Input className="text-right" type="number" min="0" value={line.discount} onChange={(e) => updateLine(index, "discount", e.target.value)} /></TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(line.quantity) * toNumber(line.unitPrice) - toNumber(line.discount))}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDraft((p) => {
                          const lines = p.lines.filter((_, i) => i !== index);
                          return { ...p, lines: lines.length ? lines : [{ ...EMPTY_LINE }] };
                        })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
            <div className="space-y-2">
              <Label>Nhà cung cấp</Label>
              <Select value={draft.supplierId} onValueChange={(value) => setDraft((p) => ({ ...p, supplierId: value }))}>
                <SelectTrigger><SelectValue placeholder="Tìm nhà cung cấp" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => {
                    const id = String(supplier.maNcc ?? supplier.id);
                    return <SelectItem key={id} value={id}>{supplier.tenNcc ?? supplier.name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mã phiếu nhập</Label>
                <Input value={draft.receiptCode} placeholder="Tự động" onChange={(e) => setDraft((p) => ({ ...p, receiptCode: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Thanh toán ngay</Label>
                <Input type="number" value={draft.paidNow} onChange={(e) => setDraft((p) => ({ ...p, paidNow: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={draft.note} placeholder="Ghi chú phiếu nhập" onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="rounded-lg bg-muted/40 p-4 text-sm">
              <div className="flex justify-between"><span>Tổng tiền hàng</span><span className="font-semibold">{formatCurrency(draftTotal)}</span></div>
              <div className="mt-2 flex justify-between"><span>Đã trả NCC</span><span>{formatCurrency(draft.paidNow)}</span></div>
              <div className="mt-3 flex justify-between border-t pt-3 text-base"><span className="font-semibold">Cần trả NCC</span><span className="font-bold text-primary">{formatCurrency(draftTotal - toNumber(draft.paidNow))}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDraftOpen(false)}>Lưu tạm</Button>
              <Button className="flex-1 gap-2" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Hoàn thành
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Theo mã phiếu nhập, nhà cung cấp..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-full lg:w-[240px]"><SelectValue placeholder="Nhà cung cấp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhà cung cấp</SelectItem>
            {suppliers.map((supplier) => {
              const id = String(supplier.maNcc ?? supplier.id);
              return <SelectItem key={id} value={id}>{supplier.tenNcc ?? supplier.name}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-rose-100 hover:bg-rose-100">
              <TableHead className="w-12"></TableHead>
              <TableHead>Mã nhập hàng</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Mã NCC</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead className="text-right">Cần trả NCC</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-36 text-center text-sm text-muted-foreground">Không tìm thấy phiếu nhập</TableCell>
              </TableRow>
            ) : paginatedItems.map((order) => (
              <Fragment key={order.code}>
                <TableRow
                  className={cn("cursor-pointer hover:bg-muted/40", expandedId === order.id && "bg-primary/5 hover:bg-primary/5")}
                  onClick={() => setExpandedId((id) => id === order.id ? null : order.id)}
                >
                  <TableCell><ChevronDown className={cn("h-4 w-4 transition-transform", expandedId === order.id && "rotate-180")} /></TableCell>
                  <TableCell className="font-semibold">{order.code}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{order.supplierId ? `NCC${order.supplierId.padStart(5, "0")}` : "--"}</TableCell>
                  <TableCell className="font-medium">{order.supplierName}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(order.debt || order.total - order.paid)}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("border", statusClass(order.status))}>{order.status}</Badge></TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
                {expandedId === order.id && <PurchaseOrderDetail order={order} />}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Hiển thị <PageSizeSelect pageSize={pageSize} onChange={setPageSize} /> / {totalItems} phiếu nhập
        </p>
        <PaginationWrapper currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </div>
  );
}
