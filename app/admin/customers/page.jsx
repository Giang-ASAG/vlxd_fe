"use client";

import { Fragment, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, MapPin, Phone, Plus, Search, Trash2, Users,
  CreditCard, History, X, Package, CircleDollarSign, Wallet, BarChart3,
  ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import {
  CustomerService,
  CongNoKhachHangService,
  LichSuThanhToanService,
} from "@/src/services/api-services";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  maKhachHang: "", hoTen: "", soDienThoai: "", diaChi: "", hanMucNo: "",
};

const EMPTY_PAY_DIALOG = {
  open: false, items: [], amount: "", method: "Chuyển khoản", note: "",
};

const PAYMENT_METHODS = ["Chuyển khoản", "Tiền mặt"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function createFormData(customer) {
  return {
    maKhachHang: customer?.maKhachHang?.toString() ?? "",
    hoTen: customer?.name ?? "",
    soDienThoai: customer?.phone ?? "",
    diaChi: customer?.address ?? "",
    hanMucNo: customer?.hanMucNo?.toString() ?? "",
  };
}

function formatCurrency(amount) {
  return `${new Intl.NumberFormat("vi-VN").format(toNumber(amount))}đ`;
}

function formatDate(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN");
}

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CustomerStatsStrip({ customer }) {
  const items = [
    {
      icon: Package,
      label: "Đơn hàng",
      value: new Intl.NumberFormat("vi-VN").format(toNumber(customer.totalOrders)),
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: CircleDollarSign,
      label: "Tổng mua",
      value: formatCurrency(customer.totalSpent),
      color: "text-primary",
      bg: "bg-primary/5",
    },
    {
      icon: Wallet,
      label: "Nợ hiện tại",
      value: formatCurrency(customer.tongConNo),
      color: toNumber(customer.tongConNo) > 0 ? "text-destructive" : "text-muted-foreground",
      bg: toNumber(customer.tongConNo) > 0 ? "bg-destructive/5" : "bg-muted/40",
    },
    {
      icon: BarChart3,
      label: "Bán − trả hàng",
      value: formatCurrency(customer.netSales),
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className={cn("rounded-xl border p-4 shadow-sm", bg)}>
          <div className="mb-2 flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", color)} />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <p className={cn("truncate text-sm font-bold tabular-nums", color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    da_thanh_toan: { label: "Đã TT", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    dang_no:       { label: "Đang nợ", className: "bg-destructive/10 text-destructive border-destructive/20" },
    cho_xu_ly:     { label: "Chờ xử lý", className: "bg-amber-100 text-amber-700 border-amber-200" },
  };
  const { label, className } = config[status] ?? {
    label: status, className: "bg-muted text-muted-foreground border-muted",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}

// ─── Payment Dialog ───────────────────────────────────────────────────────────

function PaymentDialog({ dialog, isSubmitting, onChange, onConfirm, onClose }) {
  if (!dialog.open) return null;

  const isBulk = dialog.items.length > 1;
  const total = dialog.items.reduce((s, x) => s + toNumber(x.soTienNo), 0);
  const subtitle = isBulk
    ? `${dialog.items.length} khoản nợ · Tổng ${formatCurrency(total)}`
    : `Đơn hàng #${dialog.items[0]?.maDonHang ?? ""} · Nợ ${formatCurrency(dialog.items[0]?.soTienNo)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="bg-primary/5 px-6 py-5 border-b">
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
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount" className="text-sm font-medium">
              Số tiền thanh toán <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="pay-amount"
                type="number"
                min="0"
                value={dialog.amount}
                onChange={(e) => onChange("amount", e.target.value)}
                placeholder="0"
                className="h-11 pr-8 text-base font-semibold"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">đ</span>
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
            <select
              id="pay-method"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              value={dialog.method}
              onChange={(e) => onChange("method", e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-note" className="text-sm font-medium">Ghi chú</Label>
            <Input
              id="pay-note"
              value={dialog.note}
              onChange={(e) => onChange("note", e.target.value)}
              placeholder="VD: đợt 1 tháng 5..."
              className="h-10"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="px-5">
            Hủy
          </Button>
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

export default function CustomersPage() {
  const [customers, setCustomers]               = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [search, setSearch]                     = useState("");
  const [addFormOpen, setAddFormOpen]           = useState(false);
  const [expandedId, setExpandedId]             = useState(null);
  const [formData, setFormData]                 = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [congNoData, setCongNoData]             = useState({});
  const [congNoLoading, setCongNoLoading]       = useState(false);
  const [paymentHistory, setPaymentHistory]     = useState({});
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [payDialog, setPayDialog]               = useState(EMPTY_PAY_DIALOG);

  // ─── API ────────────────────────────────────────────────────────────────────

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await CustomerService.getAll();
      if (!json.success) throw new Error("API trả về lỗi");
      const mapped = json.data.map((kh) => {
        const totalSpent = toNumber(kh.tongTienDonHang);
        const totalPaid  = toNumber(kh.tongTienDaTra);
        return {
          id: kh.maKhachHang.toString(),
          maKhachHang: kh.maKhachHang,
          name: kh.hoTen,
          phone: kh.soDienThoai,
          address: kh.diaChi,
          hanMucNo: toNumber(kh.hanMucNo),
          totalOrders: toNumber(kh.soLuongDonHang),
          totalSpent,
          tongTienDaTra: totalPaid,
          tongConNo: toNumber(kh.tongConNo),
          netSales: Math.max(totalSpent - totalPaid, 0),
        };
      });
      setCustomers(mapped);
    } catch (err) {
      setError(err.message ?? "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchCongNo = async (customerId) => {
    if (congNoData[customerId] !== undefined) return;
    setCongNoLoading(true);
    try {
      const data = await CongNoKhachHangService.getByCustomer(customerId);
      setCongNoData((prev) => ({ ...prev, [customerId]: data?.data ?? [] }));
    } catch {
      setCongNoData((prev) => ({ ...prev, [customerId]: [] }));
    } finally {
      setCongNoLoading(false);
    }
  };

  const fetchPaymentHistory = async (customerId) => {
    if (paymentHistory[customerId] !== undefined) return;
    setPaymentHistoryLoading(true);
    try {
      const data = await LichSuThanhToanService.getBy(customerId, false);
      setPaymentHistory((prev) => ({ ...prev, [customerId]: data?.data ?? [] }));
    } catch {
      setPaymentHistory((prev) => ({ ...prev, [customerId]: [] }));
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  const invalidateCongNo = (id) => setCongNoData((p) => { const n = { ...p }; delete n[id]; return n; });
  const invalidatePaymentHistory = (id) => setPaymentHistory((p) => { const n = { ...p }; delete n[id]; return n; });

  useEffect(() => { fetchCustomers(); }, []);

  // ─── Form ────────────────────────────────────────────────────────────────────

  const updateFormField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => setFormData(EMPTY_FORM);

  const handleAddClick = () => {
    setAddFormOpen((prev) => { if (!prev) { setExpandedId(null); resetForm(); } return !prev; });
  };

  const handleToggleCustomer = (customer) => {
    setAddFormOpen(false);
    if (expandedId === customer.id) { setExpandedId(null); resetForm(); return; }
    setExpandedId(customer.id);
    setFormData(createFormData(customer));
  };

  const handleSaveNewCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await CustomerService.create({
        maKhachHang: 0,
        hoTen: formData.hoTen.trim(),
        soDienThoai: formData.soDienThoai.trim(),
        diaChi: formData.diaChi.trim(),
        hanMucNo: toNumber(formData.hanMucNo),
      });
      await fetchCustomers();
      resetForm();
      setAddFormOpen(false);
    } catch (err) { alert(`Lỗi: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleSaveCustomer = async (e, customerId) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await CustomerService.update(customerId, {
        maKhachHang: customerId,
        hoTen: formData.hoTen.trim(),
        soDienThoai: formData.soDienThoai.trim(),
        diaChi: formData.diaChi.trim(),
        hanMucNo: toNumber(formData.hanMucNo),
      });
      await fetchCustomers();
      setExpandedId(null);
      resetForm();
    } catch (err) { alert(`Lỗi: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!confirm("Bạn chắc chắn muốn xóa khách hàng này?")) return;
    setIsSubmitting(true);
    try {
      await CustomerService.delete(customerId);
      await fetchCustomers();
      setExpandedId(null);
      resetForm();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("ràng buộc") || msg.includes("constraint") || msg.includes("foreign")) {
        alert("⚠️ Không thể xóa khách hàng này!\n\nLý do: Khách hàng có đơn hàng hoặc dữ liệu liên quan.");
      } else { alert(`Lỗi: ${msg}`); }
    } finally { setIsSubmitting(false); }
  };

  // ─── Payment ──────────────────────────────────────────────────────────────────

  const openPayDialog = (items, defaultAmount = "") =>
    setPayDialog({ open: true, items, amount: String(defaultAmount), method: "Chuyển khoản", note: "" });
  const closePayDialog = () => setPayDialog(EMPTY_PAY_DIALOG);
  const updatePayDialog = (field, value) => setPayDialog((prev) => ({ ...prev, [field]: value }));

  const handleConfirmPay = async () => {
    const amount = toNumber(payDialog.amount);
    if (amount <= 0) { alert("Vui lòng nhập số tiền hợp lệ."); return; }

    const items = payDialog.items;
    const totalDebt = items.reduce((sum, x) => sum + toNumber(x.soTienNo), 0);
    if (amount > totalDebt) { alert("Số tiền không được vượt quá tổng nợ."); return; }

    const isBulk = items.length > 1;
    let paymentRecords = [];

    if (!isBulk) {
      paymentRecords = [{
        id: 0, isNhaCungCap: false, conNoID: items[0].idCongNo, soTien: amount,
        phuongThucThanhToan: payDialog.method === "Chuyển khoản",
        ngayThanhToan: new Date().toISOString(),
        ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
      }];
    } else if (amount === totalDebt) {
      paymentRecords = items.map((item) => ({
        id: 0, isNhaCungCap: false, conNoID: item.idCongNo, soTien: toNumber(item.soTienNo),
        phuongThucThanhToan: payDialog.method === "Chuyển khoản",
        ngayThanhToan: new Date().toISOString(),
        ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
      }));
    } else {
      let remaining = amount;
      paymentRecords = items.map((item) => {
        let allocated = Math.floor(amount * (toNumber(item.soTienNo) / totalDebt));
        remaining -= allocated;
        return {
          id: 0, isNhaCungCap: false, conNoID: item.idCongNo, soTien: allocated,
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
      const maKh = items[0]?.maKhachHang;
      invalidateCongNo(String(maKh));
      invalidatePaymentHistory(String(maKh));
      await fetchCustomers();
      closePayDialog();
      alert("Đã ghi nhận thanh toán thành công.");
    } catch (err) { alert(`Lỗi: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  // ─── Form renderer ────────────────────────────────────────────────────────────

  const renderCustomerForm = (mode, customer = null) => {
    const isEdit = mode === "edit";

    const formFields = (
      <div className="space-y-4">
        {!isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor={`${mode}-code`} className="text-sm font-medium">Mã khách hàng</Label>
            <Input id={`${mode}-code`} value={formData.maKhachHang}
              onChange={(e) => updateFormField("maKhachHang", e.target.value)}
              placeholder="Nhập mã" required className="h-10" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-name`} className="text-sm font-medium">Tên khách hàng <span className="text-destructive">*</span></Label>
          <Input id={`${mode}-name`} value={formData.hoTen}
            onChange={(e) => updateFormField("hoTen", e.target.value)}
            placeholder="Họ và tên" required autoComplete="name" className="h-10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${mode}-phone`} className="text-sm font-medium">Số điện thoại <span className="text-destructive">*</span></Label>
            <Input id={`${mode}-phone`} type="tel" value={formData.soDienThoai}
              onChange={(e) => updateFormField("soDienThoai", e.target.value)}
              placeholder="0xxx xxx xxx" required autoComplete="tel" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${mode}-credit`} className="text-sm font-medium">Hạn mức nợ (đ)</Label>
            <Input id={`${mode}-credit`} type="number" min={0} step={1000}
              value={formData.hanMucNo}
              onChange={(e) => updateFormField("hanMucNo", e.target.value)}
              placeholder="0" className="h-10" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-address`} className="text-sm font-medium">Địa chỉ</Label>
          <Textarea id={`${mode}-address`} value={formData.diaChi}
            onChange={(e) => updateFormField("diaChi", e.target.value)}
            placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố..."
            rows={3} className="resize-y" />
        </div>
      </div>
    );

    if (isEdit && customer) {
      return (
        <div className="space-y-5">
          <CustomerStatsStrip customer={customer} />
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-muted/30 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Chỉnh sửa thông tin</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Cập nhật liên hệ, địa chỉ và hạn mức nợ.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit font-mono text-xs">
                  KH #{customer.maKhachHang}
                </Badge>
              </div>
            </CardHeader>
            <form onSubmit={(e) => handleSaveCustomer(e, customer.id)}>
              <CardContent className="pt-5">{formFields}</CardContent>
              <CardFooter className="flex flex-col-reverse gap-2 border-t bg-muted/10 py-4 sm:flex-row sm:justify-between">
                <Button type="button" variant="destructive" size="sm"
                  onClick={() => handleDeleteCustomer(customer.id)} disabled={isSubmitting}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa khách hàng
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => { resetForm(); setExpandedId(null); }}>Hủy</Button>
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Lưu thay đổi
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      );
    }

    return (
      <form onSubmit={handleSaveNewCustomer} className="space-y-5">
        {formFields}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline"
            onClick={() => { resetForm(); setAddFormOpen(false); }}>Hủy</Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Thêm khách hàng
          </Button>
        </div>
      </form>
    );
  };

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(search) || c.maKhachHang.toString().includes(search);
  });

  const { currentPage, totalPages, paginatedItems, goToPage, pageSize, setPageSize, totalItems } =
    usePagination(filteredCustomers, 10);

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders  = customers.reduce((s, c) => s + c.totalOrders, 0);
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (loading) return (
    <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span>Đang tải dữ liệu...</span>
    </div>
  );

  if (error) return (
    <div className="flex h-96 flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p className="font-medium">{error}</p>
      </div>
      <Button variant="outline" onClick={fetchCustomers}>Thử lại</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">Quản lý thông tin và công nợ</p>
        </div>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          {addFormOpen ? "Đóng form" : "Thêm khách hàng"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Users, label: "Tổng khách hàng", value: customers.length, bg: "bg-primary/10", color: "text-primary" },
          { icon: Phone, label: "Tổng doanh thu", value: formatCurrency(totalRevenue), bg: "bg-accent/10", color: "text-accent" },
          { icon: MapPin, label: "Giá trị đơn TB", value: formatCurrency(Math.round(avgOrder)), bg: "bg-chart-3/10", color: "text-chart-3" },
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
        <Input
          placeholder="Tìm theo mã, tên, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add Form */}
      {addFormOpen && (
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 text-base font-semibold">Thêm khách hàng mới</h2>
            {renderCustomerForm("create")}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[48px]" />
              <TableHead>Khách hàng</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead className="text-right">Nợ hiện tại</TableHead>
              <TableHead className="text-right">Tổng bán</TableHead>
              <TableHead className="text-right">Bán − trả hàng</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Không tìm thấy khách hàng</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((customer) => {
                const expanded = expandedId === customer.id;
                return (
                  <Fragment key={customer.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-colors",
                        expanded ? "bg-primary/5 hover:bg-primary/5" : "hover:bg-muted/40"
                      )}
                      onClick={() => handleToggleCustomer(customer)}
                    >
                      {/* Avatar */}
                      <TableCell className="pr-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(customer.name)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold text-foreground">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">#{customer.maKhachHang}</p>
                      </TableCell>

                      <TableCell>
                        <p className="text-sm">{customer.phone}</p>
                        {customer.address && (
                          <p className="max-w-[200px] truncate text-xs text-muted-foreground">{customer.address}</p>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {customer.tongConNo > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            {formatCurrency(customer.tongConNo)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>

                      <TableCell className="text-right font-medium tabular-nums text-emerald-600">
                        {formatCurrency(customer.netSales)}
                      </TableCell>

                      <TableCell>
                        {expanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </TableCell>
                    </TableRow>

                    {expanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">
                          <div className="border-t bg-muted/10 px-6 py-5">
                            <Tabs
                              defaultValue="info"
                              onValueChange={(val) => {
                                if (val === "debt") fetchCongNo(customer.id);
                                if (val === "history") fetchPaymentHistory(customer.id);
                              }}
                            >
                              <TabsList className="h-9 rounded-lg bg-muted/60 p-1">
                                <TabsTrigger value="info" className="rounded-md px-4 text-xs">
                                  Thông tin
                                </TabsTrigger>
                                <TabsTrigger value="debt" className="gap-1.5 rounded-md px-4 text-xs">
                                  <CreditCard className="h-3.5 w-3.5" /> Công nợ
                                </TabsTrigger>
                                <TabsTrigger value="history" className="gap-1.5 rounded-md px-4 text-xs">
                                  <History className="h-3.5 w-3.5" /> Lịch sử TT
                                </TabsTrigger>
                              </TabsList>

                              {/* Tab: Thông tin */}
                              <TabsContent value="info" className="mt-4">
                                {renderCustomerForm("edit", customer)}
                              </TabsContent>

                              {/* Tab: Công nợ */}
                              <TabsContent value="debt" className="mt-4">
                                {(() => {
                                  const list = (congNoData[customer.id] ?? []).filter(
                                    (x) => x.trangThaiNo !== "da_thanh_toan"
                                  );
                                  const total = list.reduce((s, x) => s + toNumber(x.soTienNo), 0);
                                  return (
                                    <div className="space-y-4 rounded-xl border bg-background p-4 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h3 className="text-sm font-semibold">Công nợ khách hàng</h3>
                                          <p className="text-xs text-muted-foreground">Các đơn chưa thanh toán</p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                          {list.length} khoản nợ
                                        </Badge>
                                      </div>

                                      {congNoLoading && congNoData[customer.id] === undefined ? (
                                        <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span className="text-sm">Đang tải...</span>
                                        </div>
                                      ) : (
                                        <div className="overflow-hidden rounded-lg border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                                                <TableHead>Mã đơn</TableHead>
                                                <TableHead>Ngày phát sinh</TableHead>
                                                <TableHead className="text-right">Tổng tiền</TableHead>
                                                <TableHead className="text-right">Đã TT</TableHead>
                                                <TableHead className="text-right">Còn nợ</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                                <TableHead />
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {list.length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">
                                                    Không có khoản nợ nào 🎉
                                                  </TableCell>
                                                </TableRow>
                                              ) : list.map((item) => (
                                                <TableRow key={item.idCongNo} className="text-sm hover:bg-muted/30">
                                                  <TableCell className="font-medium">{item.maDonHang}</TableCell>
                                                  <TableCell className="text-muted-foreground">{formatDate(item.ngayPhatSinh)}</TableCell>
                                                  <TableCell className="text-right tabular-nums">{formatCurrency(item.tongTienDonHang)}</TableCell>
                                                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(item.soTienDaTra)}</TableCell>
                                                  <TableCell className="text-right">
                                                    <span className="font-semibold text-destructive tabular-nums">
                                                      {formatCurrency(item.soTienNo)}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell><StatusBadge status={item.trangThaiNo} /></TableCell>
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
                                            Tổng nợ:{" "}
                                            <span className="font-bold text-destructive">{formatCurrency(total)}</span>
                                          </p>
                                          <Button size="sm" onClick={() => openPayDialog(list, total)} className="gap-1.5">
                                            <CreditCard className="h-3.5 w-3.5" /> Thanh toán tất cả
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TabsContent>

                              {/* Tab: Lịch sử TT */}
                              <TabsContent value="history" className="mt-4">
                                {(() => {
                                  const history = paymentHistory[customer.id] ?? [];
                                  return (
                                    <div className="space-y-4 rounded-xl border bg-background p-4 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h3 className="text-sm font-semibold">Lịch sử thanh toán</h3>
                                          <p className="text-xs text-muted-foreground">Các giao dịch đã thực hiện</p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                          {history.length} giao dịch
                                        </Badge>
                                      </div>

                                      {paymentHistoryLoading && paymentHistory[customer.id] === undefined ? (
                                        <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span className="text-sm">Đang tải...</span>
                                        </div>
                                      ) : (
                                        <div className="overflow-hidden rounded-lg border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                                                <TableHead>Mã đơn</TableHead>
                                                <TableHead>Ngày thanh toán</TableHead>
                                                <TableHead className="text-right">Số tiền</TableHead>
                                                <TableHead>Phương thức</TableHead>
                                                <TableHead>Ghi chú</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {history.length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                                                    Chưa có giao dịch nào
                                                  </TableCell>
                                                </TableRow>
                                              ) : history.map((record, idx) => (
                                                <TableRow key={idx} className="text-sm hover:bg-muted/30">
                                                  <TableCell className="font-medium">{record.maDonHang}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                  {new Date(record.ngayPhatSinh).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                  <TableCell className="text-right font-semibold tabular-nums text-emerald-600">
                                                    +{formatCurrency(record.soTienThanhToan)}
                                                  </TableCell>
                                                  <TableCell>
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                                      {record.phuongThucThanhToan || "Chuyển khoản"}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                                    {record.ghiChu || "--"}
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
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Hiển thị <PageSizeSelect pageSize={pageSize} onChange={setPageSize} /> / {totalItems} khách hàng
        </p>
        <PaginationWrapper currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      <PaymentDialog
        dialog={payDialog}
        isSubmitting={isSubmitting}
        onChange={updatePayDialog}
        onConfirm={handleConfirmPay}
        onClose={closePayDialog}
      />
    </div>
  );
}