"use client";

import { Fragment, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, CreditCard, History, Loader2, Mail, MapPin, Phone,
  Plus, Search, Trash2, Truck, X, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import {
  SupplierService,
  CongNoNccService,
  LichSuThanhToanService,
} from "@/src/services/api-services";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { tenNcc: "", soDienThoai: "", email: "", diaChi: "", ghiChu: "" };
const EMPTY_PAY_DIALOG = { open: false, items: [], amount: "", method: "Chuyển khoản", note: "" };
const PAYMENT_METHODS = ["Chuyển khoản", "Tiền mặt"];

const TRANG_THAI_NO_LABEL  = { dang_no: "Đang nợ", da_thanh_toan: "Đã TT", cho_xu_ly: "Chờ xử lý" };
const TRANG_THAI_NHAP_LABEL = { cho_nhap: "Chờ nhập", da_nhap_kho: "Đã nhập kho" };
const TRANG_THAI_NO_COLOR  = {
  dang_no:       "bg-destructive/10 text-destructive border-destructive/20",
  da_thanh_toan: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cho_xu_ly:     "bg-amber-100 text-amber-700 border-amber-200",
};
const TRANG_THAI_NHAP_COLOR = {
  cho_nhap:    "bg-muted text-muted-foreground border-muted",
  da_nhap_kho: "bg-blue-100 text-blue-700 border-blue-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function toText(v)   { return v == null ? "" : String(v); }

function createFormData(s) {
  return { tenNcc: s?.name ?? "", soDienThoai: s?.phone ?? "", email: s?.email ?? "", diaChi: s?.address ?? "", ghiChu: s?.ghiChu ?? "" };
}

function formatCurrencyVN(amount) {
  return `${new Intl.NumberFormat("vi-VN").format(toNumber(amount))}đ`;
}

function formatDateTime(d) {
  if (!d) return "--";
  const dt = new Date(d);
  return dt.toLocaleDateString("vi-VN") + " " + dt.toLocaleTimeString("vi-VN");
}

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SupplierStatsStrip({ supplier }) {
  const items = [
    { icon: Phone,      label: "Số điện thoại",    value: supplier.phone || "--",              color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
    { icon: Mail,       label: "Email",             value: supplier.email || "--",              color: "text-primary",     bg: "bg-primary/5" },
    { icon: MapPin,     label: "Địa chỉ",           value: supplier.address || "--",            color: "text-muted-foreground", bg: "bg-muted/40" },
    { icon: CreditCard, label: "Công nợ hiện tại",  value: formatCurrencyVN(supplier.debt),
      color: toNumber(supplier.debt) > 0 ? "text-destructive" : "text-muted-foreground",
      bg:    toNumber(supplier.debt) > 0 ? "bg-destructive/5"  : "bg-muted/40" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className={cn("rounded-xl border p-4 shadow-sm", bg)}>
          <div className="mb-2 flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", color)} />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <p className={cn("truncate text-sm font-bold", color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ value, labelMap, colorMap }) {
  const label = labelMap[value] ?? value;
  const cls   = colorMap?.[value] ?? "bg-muted text-muted-foreground border-muted";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {label}
    </span>
  );
}

// ─── Payment Dialog ───────────────────────────────────────────────────────────

function PaymentDialog({ dialog, isSubmitting, onChange, onConfirm, onClose }) {
  if (!dialog.open) return null;
  const isBulk   = dialog.items.length > 1;
  const total    = dialog.items.reduce((s, x) => s + toNumber(x.soTienNo), 0);
  const subtitle = isBulk
    ? `${dialog.items.length} khoản nợ · Tổng ${formatCurrencyVN(total)}`
    : `Phiếu PN${String(dialog.items[0]?.maPhieuNhap ?? "").padStart(4, "0")} · Nợ ${formatCurrencyVN(dialog.items[0]?.soTienNo)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="border-b bg-primary/5 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Xác nhận thanh toán</h3>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount" className="text-sm font-medium">
              Số tiền thanh toán <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input id="pay-amount" type="number" min="0" value={dialog.amount}
                onChange={(e) => onChange("amount", e.target.value)}
                placeholder="0" className="h-11 pr-8 text-base font-semibold" autoFocus />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">đ</span>
            </div>
            {isBulk && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                Số tiền sẽ được phân bổ tỷ lệ theo từng khoản nợ.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-method" className="text-sm font-medium">Phương thức thanh toán</Label>
            <select id="pay-method"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={dialog.method} onChange={(e) => onChange("method", e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-note" className="text-sm font-medium">Ghi chú</Label>
            <Input id="pay-note" value={dialog.note}
              onChange={(e) => onChange("note", e.target.value)}
              placeholder="VD: đợt 1 tháng 5..." className="h-10" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="px-5">Hủy</Button>
          <Button onClick={onConfirm} disabled={isSubmitting} className="gap-2 px-5">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Xác nhận
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [suppliers, setSuppliers]           = useState([]);
  const [search, setSearch]                 = useState("");
  const [addFormOpen, setAddFormOpen]       = useState(false);
  const [expandedId, setExpandedId]         = useState(null);
  const [formData, setFormData]             = useState(EMPTY_FORM);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [congNoData, setCongNoData]         = useState({});
  const [congNoLoading, setCongNoLoading]   = useState(false);
  const [paymentHistory, setPaymentHistory] = useState({});
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [payDialog, setPayDialog]           = useState(EMPTY_PAY_DIALOG);

  // ─── API ────────────────────────────────────────────────────────────────────

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const result  = await SupplierService.getAll();
      const apiData = result.data;
      if (!apiData || !Array.isArray(apiData)) throw new Error("Invalid data format");
      setSuppliers(apiData.map((item) => {
        const id = toText(item.maNcc);
        return {
          id,
          maNhaCungCap: `NCC${id.padStart(3, "0")}`,
          name: toText(item.tenNcc),
          phone: toText(item.soDienThoai),
          email: toText(item.email),
          address: toText(item.diaChi),
          debt: toNumber(item.conNo),
          totalPurchase: toNumber(item.tongTienNhap),
          ghiChu: toText(item.ghiChu),
        };
      }));
      setError(null);
    } catch (err) {
      setError("Không thể tải danh sách nhà cung cấp. Vui lòng kiểm tra kết nối API.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCongNo = async (id) => {
    if (congNoData[id] !== undefined) return;
    setCongNoLoading(true);
    try {
      const data = await CongNoNccService.getBySupplier(id);
      setCongNoData((p) => ({ ...p, [id]: data?.data ?? [] }));
    } catch { setCongNoData((p) => ({ ...p, [id]: [] })); }
    finally { setCongNoLoading(false); }
  };

  const fetchPaymentHistory = async (id) => {
    if (paymentHistory[id] !== undefined) return;
    setPaymentHistoryLoading(true);
    try {
      const data = await LichSuThanhToanService.getBy(id, true);
      setPaymentHistory((p) => ({ ...p, [id]: data?.data ?? [] }));
    } catch { setPaymentHistory((p) => ({ ...p, [id]: [] })); }
    finally { setPaymentHistoryLoading(false); }
  };

  const invalidateCongNo       = (id) => setCongNoData((p)      => { const n = { ...p }; delete n[id]; return n; });
  const invalidatePaymentHistory = (id) => setPaymentHistory((p) => { const n = { ...p }; delete n[id]; return n; });

  useEffect(() => { fetchSuppliers(); }, []);

  // ─── Form ────────────────────────────────────────────────────────────────────

  const updateFormField = (field, value) => setFormData((p) => ({ ...p, [field]: value }));
  const resetForm = () => setFormData(EMPTY_FORM);

  const handleAddClick = () => {
    setAddFormOpen((p) => { if (!p) { setExpandedId(null); resetForm(); } return !p; });
  };

  const handleToggleSupplier = (supplier) => {
    setAddFormOpen(false);
    if (expandedId === supplier.id) { setExpandedId(null); resetForm(); return; }
    setExpandedId(supplier.id);
    setFormData(createFormData(supplier));
  };

  const handleSaveNewSupplier = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await SupplierService.create({
        maNcc: 0, tenNcc: formData.tenNcc.trim(), soDienThoai: formData.soDienThoai.trim(),
        email: formData.email.trim(), diaChi: formData.diaChi.trim(), ghiChu: formData.ghiChu.trim(),
      });
      await fetchSuppliers(); resetForm(); setAddFormOpen(false);
    } catch (err) { alert(`Lỗi: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleSaveSupplier = async (e, supplierId) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await SupplierService.update(supplierId, {
        maNcc: toNumber(supplierId), tenNcc: formData.tenNcc.trim(),
        soDienThoai: formData.soDienThoai.trim(), email: formData.email.trim(),
        diaChi: formData.diaChi.trim(), ghiChu: formData.ghiChu.trim(),
      });
      await fetchSuppliers(); setExpandedId(null); resetForm();
    } catch (err) { alert(`Lỗi: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!confirm("Bạn chắc chắn muốn xóa nhà cung cấp này?")) return;
    setIsSubmitting(true);
    try {
      await SupplierService.delete(supplierId);
      await fetchSuppliers(); setExpandedId(null); resetForm();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("ràng buộc") || msg.includes("constraint") || msg.includes("foreign") || msg.includes("related")) {
        alert("⚠️ Không thể xóa nhà cung cấp này!\n\nLý do: Nhà cung cấp có dữ liệu liên quan trong hệ thống.");
      } else { alert(`Lỗi: ${msg}`); }
    } finally { setIsSubmitting(false); }
  };

  // ─── Payment ──────────────────────────────────────────────────────────────────

  const openPayDialog = (items, defaultAmount = "") =>
    setPayDialog({ open: true, items, amount: String(defaultAmount), method: "Chuyển khoản", note: "" });
  const closePayDialog  = () => setPayDialog(EMPTY_PAY_DIALOG);
  const updatePayDialog = (field, value) => setPayDialog((p) => ({ ...p, [field]: value }));

  const handleConfirmPay = async () => {
    const amount = toNumber(payDialog.amount);
    if (amount <= 0) { alert("Vui lòng nhập số tiền hợp lệ."); return; }

    const items     = payDialog.items;
    const totalDebt = items.reduce((sum, x) => sum + toNumber(x.soTienNo), 0);
    if (amount > totalDebt) { alert("Số tiền không được vượt quá tổng nợ."); return; }

    const isBulk = items.length > 1;
    let paymentRecords = [];

    if (!isBulk) {
      paymentRecords = [{
        id: 0, isNhaCungCap: true, conNoID: items[0].idCongNo, soTien: amount,
        phuongThucThanhToan: payDialog.method === "Chuyển khoản",
        ngayThanhToan: new Date().toISOString(),
        ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
      }];
    } else if (amount === totalDebt) {
      paymentRecords = items.map((item) => ({
        id: 0, isNhaCungCap: true, conNoID: item.idCongNo, soTien: toNumber(item.soTienNo),
        phuongThucThanhToan: payDialog.method === "Chuyển khoản",
        ngayThanhToan: new Date().toISOString(),
        ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
      }));
    } else {
      let remaining = amount;
      paymentRecords = items.map((item) => {
        const allocated = Math.floor(amount * (toNumber(item.soTienNo) / totalDebt));
        remaining -= allocated;
        return {
          id: 0, isNhaCungCap: true, conNoID: item.idCongNo, soTien: allocated,
          phuongThucThanhToan: payDialog.method === "Chuyển khoản",
          ngayThanhToan: new Date().toISOString(),
          ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
        };
      });
      const maxIdx = paymentRecords.reduce((max, r, i) => r.soTien > paymentRecords[max].soTien ? i : max, 0);
      paymentRecords[maxIdx].soTien += remaining;
    }

    paymentRecords = paymentRecords.filter((r) => r.soTien > 0);
    if (!paymentRecords.length) { alert("Không có khoản thanh toán hợp lệ."); return; }

    try {
      setIsSubmitting(true);
      await LichSuThanhToanService.create(paymentRecords);
      const maNcc = items[0]?.maNhaCungCap;
      invalidateCongNo(String(maNcc));
      invalidatePaymentHistory(String(maNcc));
      await fetchSuppliers();
      closePayDialog();
      alert("Đã ghi nhận thanh toán thành công.");
    } catch (err) { alert(`Lỗi: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  // ─── Form renderer ────────────────────────────────────────────────────────────

  const renderSupplierForm = (mode, supplier) => {
    const isEdit = mode === "edit";
    return (
      <form onSubmit={(e) => isEdit && supplier ? handleSaveSupplier(e, supplier.id) : handleSaveNewSupplier(e)}
        className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm font-medium">Tên nhà cung cấp <span className="text-destructive">*</span></Label>
            <Input value={formData.tenNcc} onChange={(e) => updateFormField("tenNcc", e.target.value)}
              placeholder="Nhập tên nhà cung cấp" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Số điện thoại <span className="text-destructive">*</span></Label>
            <Input value={formData.soDienThoai} onChange={(e) => updateFormField("soDienThoai", e.target.value)}
              placeholder="Nhập số điện thoại" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => updateFormField("email", e.target.value)}
              placeholder="Nhập email" className="h-10" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm font-medium">Địa chỉ</Label>
            <Input value={formData.diaChi} onChange={(e) => updateFormField("diaChi", e.target.value)}
              placeholder="Nhập địa chỉ" className="h-10" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm font-medium">Ghi chú</Label>
            <Textarea value={formData.ghiChu} onChange={(e) => updateFormField("ghiChu", e.target.value)}
              placeholder="Nhập ghi chú (nếu có)" rows={3} className="resize-y" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <div>
            {isEdit && supplier && (
              <Button type="button" variant="destructive" size="sm"
                onClick={() => handleDeleteSupplier(supplier.id)} disabled={isSubmitting}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa nhà cung cấp
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={() => { resetForm(); if (isEdit) setExpandedId(null); else setAddFormOpen(false); }}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Lưu thay đổi" : "Thêm nhà cung cấp"}
            </Button>
          </div>
        </div>
      </form>
    );
  };

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.phone.includes(search) ||
      s.email.toLowerCase().includes(q) || s.maNhaCungCap.toLowerCase().includes(q);
  });

  const { currentPage, totalPages, paginatedItems, goToPage, pageSize, setPageSize, totalItems } =
    usePagination(filteredSuppliers, 10);

  const totalDebt     = suppliers.reduce((s, x) => s + toNumber(x.debt), 0);
  const totalPurchase = suppliers.reduce((s, x) => s + toNumber(x.totalPurchase), 0);

  if (loading) return (
    <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span>Đang tải dữ liệu nhà cung cấp...</span>
    </div>
  );

  if (error) return (
    <div className="flex h-96 flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p className="font-medium">{error}</p>
      </div>
      <Button variant="outline" onClick={fetchSuppliers}>Thử lại</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhà cung cấp</h1>
          <p className="text-sm text-muted-foreground">Quản lý thông tin và công nợ nhà cung cấp</p>
        </div>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          {addFormOpen ? "Đóng form" : "Thêm nhà cung cấp"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Building2, label: "Tổng nhà cung cấp", value: suppliers.length,               bg: "bg-primary/10",     color: "text-primary" },
          { icon: Truck,     label: "Tổng mua",           value: formatCurrencyVN(totalPurchase), bg: "bg-accent/10",      color: "text-accent" },
          { icon: CreditCard,label: "Nợ cần trả",         value: formatCurrencyVN(totalDebt),     bg: "bg-destructive/10", color: "text-destructive" },
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
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Tìm theo mã, tên, SĐT hoặc email..."
          value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Add Form */}
      {addFormOpen && (
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 text-base font-semibold">Thêm nhà cung cấp mới</h2>
            {renderSupplierForm("create")}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[48px]" />
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Nợ cần trả</TableHead>
              <TableHead className="text-right">Tổng mua</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Truck className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Không tìm thấy nhà cung cấp</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedItems.map((supplier) => {
              const isExpanded = expandedId === supplier.id;
              return (
                <Fragment key={supplier.id}>
                  <TableRow
                    className={cn("cursor-pointer transition-colors",
                      isExpanded ? "bg-primary/5 hover:bg-primary/5" : "hover:bg-muted/40")}
                    onClick={() => handleToggleSupplier(supplier)}
                  >
                    {/* Avatar */}
                    <TableCell className="pr-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(supplier.name)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <p className="font-semibold">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{supplier.maNhaCungCap}</p>
                    </TableCell>

                    <TableCell>
                      <p className="text-sm">{supplier.phone}</p>
                      {supplier.address && (
                        <p className="max-w-[180px] truncate text-xs text-muted-foreground">{supplier.address}</p>
                      )}
                    </TableCell>

                    <TableCell className="text-sm">{supplier.email || "--"}</TableCell>

                    <TableCell className="text-right">
                      {supplier.debt > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                          {formatCurrencyVN(supplier.debt)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrencyVN(supplier.totalPurchase)}
                    </TableCell>

                    <TableCell>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="p-0">
                        <div className="border-t bg-muted/10 px-6 py-5">
                          <Tabs defaultValue="supplier-info"
                            onValueChange={(val) => {
                              if (val === "cong-no") fetchCongNo(supplier.id);
                              if (val === "payment-history") fetchPaymentHistory(supplier.id);
                            }}
                          >
                            <TabsList className="h-9 rounded-lg bg-muted/60 p-1">
                              <TabsTrigger value="supplier-info" className="rounded-md px-4 text-xs">
                                Thông tin
                              </TabsTrigger>
                              <TabsTrigger value="cong-no" className="gap-1.5 rounded-md px-4 text-xs">
                                <History className="h-3.5 w-3.5" /> Công nợ
                              </TabsTrigger>
                              <TabsTrigger value="payment-history" className="gap-1.5 rounded-md px-4 text-xs">
                                <CreditCard className="h-3.5 w-3.5" /> Lịch sử TT
                              </TabsTrigger>
                            </TabsList>

                            {/* Tab: Thông tin */}
                            <TabsContent value="supplier-info" className="mt-4 space-y-4">
                              <SupplierStatsStrip supplier={supplier} />
                              <Card className="overflow-hidden shadow-sm">
                                <CardContent className="p-5">
                                  {renderSupplierForm("edit", supplier)}
                                </CardContent>
                              </Card>
                            </TabsContent>

                            {/* Tab: Công nợ */}
                            <TabsContent value="cong-no" className="mt-4">
                              {(() => {
                                const list = (congNoData[supplier.id] ?? []).filter((x) => x.trangThaiNo !== "da_thanh_toan");
                                const totalDebtList = list.reduce((s, x) => s + toNumber(x.soTienNo), 0);
                                return (
                                  <div className="space-y-4 rounded-xl border bg-background p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h3 className="text-sm font-semibold">Công nợ nhà cung cấp</h3>
                                        <p className="text-xs text-muted-foreground">Các khoản nợ từ phiếu nhập hàng</p>
                                      </div>
                                      <Badge variant="secondary" className="text-xs">{list.length} khoản nợ</Badge>
                                    </div>

                                    {congNoLoading && congNoData[supplier.id] === undefined ? (
                                      <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Đang tải...</span>
                                      </div>
                                    ) : (
                                      <div className="overflow-hidden rounded-lg border">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                                              <TableHead>Mã phiếu</TableHead>
                                              <TableHead>Ngày phát sinh</TableHead>
                                              <TableHead>Loại nhập</TableHead>
                                              <TableHead>Người lập</TableHead>
                                              <TableHead className="text-right">Tổng nhập</TableHead>
                                              <TableHead className="text-right">Đã TT</TableHead>
                                              <TableHead className="text-right">Còn nợ</TableHead>
                                              <TableHead>TT nhập</TableHead>
                                              <TableHead>TT nợ</TableHead>
                                              <TableHead />
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {list.length === 0 ? (
                                              <TableRow>
                                                <TableCell colSpan={10} className="h-20 text-center text-sm text-muted-foreground">
                                                  Không có khoản nợ nào 🎉
                                                </TableCell>
                                              </TableRow>
                                            ) : list.map((item) => (
                                              <TableRow key={item.idCongNo} className="text-sm hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                  PN{String(item.maPhieuNhap).padStart(4, "0")}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                  {new Date(item.ngayPhatSinh).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell>{item.loaiNhap ? item.tenKhoNhap : "Nhập cửa hàng"}</TableCell>
                                                <TableCell>{item.tenNguoiLap}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatCurrencyVN(item.tongTienNhap)}</TableCell>
                                                <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrencyVN(item.daThanhToanNcc)}</TableCell>
                                                <TableCell className="text-right">
                                                  <span className="font-semibold text-destructive tabular-nums">
                                                    {formatCurrencyVN(item.soTienNo)}
                                                  </span>
                                                </TableCell>
                                                <TableCell>
                                                  <StatusBadge value={item.trangThaiNhapHang} labelMap={TRANG_THAI_NHAP_LABEL} colorMap={TRANG_THAI_NHAP_COLOR} />
                                                </TableCell>
                                                <TableCell>
                                                  <StatusBadge value={item.trangThaiNo} labelMap={TRANG_THAI_NO_LABEL} colorMap={TRANG_THAI_NO_COLOR} />
                                                </TableCell>
                                                <TableCell>
                                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                                    onClick={() => openPayDialog([item], item.soTienNo)}>
                                                    Thanh toán
                                                  </Button>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}

                                    {list.length > 0 && (
                                      <div className="flex items-center justify-between rounded-lg bg-destructive/5 px-4 py-3">
                                        <p className="text-sm">
                                          Tổng nợ cần trả:{" "}
                                          <span className="font-bold text-destructive">{formatCurrencyVN(totalDebtList)}</span>
                                        </p>
                                        <Button size="sm" onClick={() => openPayDialog(list, totalDebtList)} className="gap-1.5">
                                          <CreditCard className="h-3.5 w-3.5" /> Thanh toán tất cả
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </TabsContent>

                            {/* Tab: Lịch sử TT */}
                            <TabsContent value="payment-history" className="mt-4">
                              {(() => {
                                const history = paymentHistory[supplier.id] ?? [];
                                return (
                                  <div className="space-y-4 rounded-xl border bg-background p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h3 className="text-sm font-semibold">Lịch sử thanh toán</h3>
                                        <p className="text-xs text-muted-foreground">Các giao dịch đã thực hiện</p>
                                      </div>
                                      <Badge variant="secondary" className="text-xs">{history.length} giao dịch</Badge>
                                    </div>

                                    {paymentHistoryLoading && paymentHistory[supplier.id] === undefined ? (
                                      <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Đang tải...</span>
                                      </div>
                                    ) : (
                                      <div className="overflow-hidden rounded-lg border">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                                              <TableHead>Mã phiếu nhập</TableHead>
                                              <TableHead>Ngày thanh toán</TableHead>
                                              <TableHead>Loại Nhập</TableHead>
                                              <TableHead className="text-right">Tổng nhập</TableHead>
                                              <TableHead className="text-right">Số tiền TT</TableHead>
                                              <TableHead className="text-right">Đã TT</TableHead>
                                              <TableHead className="text-right">Còn nợ</TableHead>
                                              <TableHead>Phương thức</TableHead>
                                              <TableHead>Ghi chú</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {history.length === 0 ? (
                                              <TableRow>
                                                <TableCell colSpan={9} className="h-20 text-center text-sm text-muted-foreground">
                                                  Chưa có giao dịch nào
                                                </TableCell>
                                              </TableRow>
                                            ) : history.map((item, idx) => (
                                              <TableRow key={idx} className="text-sm hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                  PN{String(item.maPhieu).padStart(4, "0")}
                                                </TableCell>
                                                  <TableCell className="text-muted-foreground">
                                                  {new Date(item.ngayPhatSinh).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell>{item.loaiNhap ? item.tenKhoNhap : "Nhập cửa hàng"}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatCurrencyVN(item.tongTienNhap)}</TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums text-emerald-600">
                                                  +{formatCurrencyVN(item.soTienThanhToan)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{formatCurrencyVN(item.tongDaThanhToan)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatCurrencyVN(item.conNo)}</TableCell>
                                                <TableCell>
                                                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                                    {item.phuongThucThanhToan}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="max-w-[180px] truncate text-muted-foreground">
                                                  {item.ghiChu || "--"}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Hiển thị <PageSizeSelect pageSize={pageSize} onChange={setPageSize} /> / {totalItems} nhà cung cấp
        </p>
        <PaginationWrapper currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      <PaymentDialog
        dialog={payDialog} isSubmitting={isSubmitting}
        onChange={updatePayDialog} onConfirm={handleConfirmPay} onClose={closePayDialog}
      />
    </div>
  );
}