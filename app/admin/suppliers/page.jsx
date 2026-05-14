"use client";

import { Fragment, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  CreditCard,
  History,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import { SupplierPaymentService, SupplierService } from "@/src/services/api-services";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  tenNcc: "",
  soDienThoai: "",
  email: "",
  diaChi: "",
  ghiChu: "",
};

const EMPTY_PAY_DIALOG = {
  open: false,
  items: [],
  amount: "",
  method: "Chuyển khoản",
  note: "",
};

const PAYMENT_METHODS = ["Chuyển khoản", "Tiền mặt"];

const TRANG_THAI_NO_LABEL = {
  dang_no: "Đang nợ",
  da_thanh_toan: "Đã TT",
  cho_xu_ly: "Chờ xử lý",
};

const TRANG_THAI_NHAP_LABEL = {
  cho_nhap: "Chờ nhập",
  da_nhap_kho: "Đã nhập kho",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toText(value) {
  return value == null ? "" : String(value);
}

function createFormData(supplier) {
  return {
    tenNcc: supplier?.name ?? "",
    soDienThoai: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    diaChi: supplier?.address ?? "",
    ghiChu: supplier?.ghiChu ?? "",
  };
}

function formatCurrencyVN(amount) {
  return `${new Intl.NumberFormat("vi-VN").format(toNumber(amount))}đ`;
}

function formatDateTime(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SupplierInfoSummary({ supplier }) {
  const items = [
    { icon: Phone, label: "Số điện thoại", value: supplier.phone || "--" },
    { icon: Mail, label: "Email", value: supplier.email || "--" },
    { icon: MapPin, label: "Địa chỉ", value: supplier.address || "--" },
    {
      icon: CreditCard,
      label: "Công nợ hiện tại",
      value: formatCurrencyVN(supplier.debt),
      valueClassName: toNumber(supplier.debt) > 0 ? "text-destructive" : "",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(({ icon: Icon, label, value, valueClassName }) => (
        <div key={label} className="rounded-lg border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
          <p className={`break-words text-sm font-semibold ${valueClassName ?? ""}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ value, labelMap, colorMap }) {
  const label = labelMap[value] ?? value;
  const color = colorMap?.[value] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
  );
}

const TRANG_THAI_NO_COLOR = {
  dang_no: "bg-destructive/10 text-destructive",
  da_thanh_toan: "bg-green-100 text-green-700",
  cho_xu_ly: "bg-yellow-100 text-yellow-700",
};

const TRANG_THAI_NHAP_COLOR = {
  cho_nhap: "bg-muted text-muted-foreground",
  da_nhap_kho: "bg-blue-100 text-blue-700",
};

// ─── Payment Dialog ───────────────────────────────────────────────────────────

function PaymentDialog({ dialog, isSubmitting, onChange, onConfirm, onClose }) {
  if (!dialog.open) return null;

  const isBulk = dialog.items.length > 1;
  const subtitle = isBulk
    ? `${dialog.items.length} khoản nợ · Tổng ${formatCurrencyVN(dialog.items.reduce((s, x) => s + toNumber(x.soTienNo), 0))}`
    : `Phiếu PN${String(dialog.items[0]?.maPhieuNhap ?? "").padStart(4, "0")} · Nợ ${formatCurrencyVN(dialog.items[0]?.soTienNo)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h3 className="text-lg font-semibold">Xác nhận thanh toán</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Số tiền thanh toán *</Label>
            <Input
              id="pay-amount"
              type="number"
              min="0"
              value={dialog.amount}
              onChange={(e) => onChange("amount", e.target.value)}
              placeholder="Nhập số tiền"
              autoFocus
            />
            {isBulk && (
              <p className="text-xs text-muted-foreground">
                ⚡ Số tiền sẽ được phân bổ tỷ lệ theo từng khoản nợ.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-method">Phương thức thanh toán</Label>
            <select
              id="pay-method"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={dialog.method}
              onChange={(e) => onChange("method", e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-note">Ghi chú</Label>
            <Input
              id="pay-note"
              value={dialog.note}
              onChange={(e) => onChange("note", e.target.value)}
              placeholder="Ví dụ: đợt 1 tháng 5..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t p-5 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận thanh toán
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [expandedSupplierId, setExpandedSupplierId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Công nợ cache: { [supplierId]: CongNo[] }
  const [congNoData, setCongNoData] = useState({});
  const [congNoLoading, setCongNoLoading] = useState(false);

  // Lịch sử thanh toán cache (API mới)
  const [paymentHistory, setPaymentHistory] = useState({});
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);

  // Payment dialog state
  const [payDialog, setPayDialog] = useState(EMPTY_PAY_DIALOG);

  // ─── API ────────────────────────────────────────────────────────────────────

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const result = await SupplierService.getAll();
      const apiData = result.data;
      if (!apiData || !Array.isArray(apiData)) throw new Error("Invalid data format");

      const mappedSuppliers = apiData.map((item) => {
        const supplierId = toText(item.maNcc);
        return {
          id: supplierId,
          maNhaCungCap: `NCC${supplierId.padStart(3, "0")}`,
          name: toText(item.tenNcc),
          phone: toText(item.soDienThoai),
          email: toText(item.email),
          address: toText(item.diaChi),
          debt: toNumber(item.conNo),
          totalPurchase: toNumber(item.tongTienNhap),
          ghiChu: toText(item.ghiChu),
        };
      });

      setSuppliers(mappedSuppliers);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách nhà cung cấp. Vui lòng kiểm tra kết nối API.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCongNo = async (supplierId) => {
    if (congNoData[supplierId] !== undefined) return;
    setCongNoLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5128/api/CongNoNccs/nha-cung-cap/${supplierId}`
      );
      const json = await res.json();
      setCongNoData((prev) => ({ ...prev, [supplierId]: json.data ?? [] }));
    } catch (err) {
      console.error("Lỗi tải công nợ:", err);
      setCongNoData((prev) => ({ ...prev, [supplierId]: [] }));
    } finally {
      setCongNoLoading(false);
    }
  };

  const fetchPaymentHistory = async (supplierId) => {
    if (paymentHistory[supplierId] !== undefined) return;
    setPaymentHistoryLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5128/api/LichSuThanhToans/${supplierId}?isNcc=true`
      );
      const json = await res.json();
      setPaymentHistory((prev) => ({ ...prev, [supplierId]: json.data ?? [] }));
    } catch (err) {
      console.error("Lỗi tải lịch sử thanh toán:", err);
      setPaymentHistory((prev) => ({ ...prev, [supplierId]: [] }));
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  const invalidateCongNo = (supplierId) => {
    setCongNoData((prev) => {
      const next = { ...prev };
      delete next[String(supplierId)];
      return next;
    });
  };

  const invalidatePaymentHistory = (supplierId) => {
    setPaymentHistory((prev) => {
      const next = { ...prev };
      delete next[String(supplierId)];
      return next;
    });
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // ─── Form helpers ────────────────────────────────────────────────────────────

  const updateFormField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const resetForm = () => setFormData(EMPTY_FORM);

  // ─── Supplier CRUD ────────────────────────────────────────────────────────────

  const handleAddClick = () => {
    setAddFormOpen((prev) => {
      if (!prev) {
        setExpandedSupplierId(null);
        resetForm();
      }
      return !prev;
    });
  };

  const handleToggleSupplier = (supplier) => {
    setAddFormOpen(false);
    if (expandedSupplierId === supplier.id) {
      setExpandedSupplierId(null);
      resetForm();
      return;
    }
    setExpandedSupplierId(supplier.id);
    setFormData(createFormData(supplier));
  };

  const handleSaveNewSupplier = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      maNcc: 0,
      tenNcc: formData.tenNcc.trim(),
      soDienThoai: formData.soDienThoai.trim(),
      email: formData.email.trim(),
      diaChi: formData.diaChi.trim(),
      ghiChu: formData.ghiChu.trim(),
    };
    try {
      await SupplierService.create(payload);
      await fetchSuppliers();
      resetForm();
      setAddFormOpen(false);
    } catch (err) {
      console.error(err);
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSupplier = async (e, supplierId) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      maNcc: toNumber(supplierId),
      tenNcc: formData.tenNcc.trim(),
      soDienThoai: formData.soDienThoai.trim(),
      email: formData.email.trim(),
      diaChi: formData.diaChi.trim(),
      ghiChu: formData.ghiChu.trim(),
    };
    try {
      await SupplierService.update(supplierId, payload);
      await fetchSuppliers();
      setExpandedSupplierId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!confirm("Bạn chắc chắn muốn xóa nhà cung cấp này?")) return;
    try {
      setIsSubmitting(true);
      await SupplierService.delete(supplierId);
      await fetchSuppliers();
      setExpandedSupplierId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      const msg = err.message || "";
      if (
        msg.includes("ràng buộc") ||
        msg.includes("constraint") ||
        msg.includes("foreign") ||
        msg.includes("related")
      ) {
        alert(
          "⚠️ Không thể xóa nhà cung cấp này!\n\nLý do: Nhà cung cấp có các đơn mua hoặc dữ liệu liên quan trong hệ thống.\n\nHãy xóa các dữ liệu liên quan trước khi xóa nhà cung cấp."
        );
      } else {
        alert(`Lỗi: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Payment Logic (New API) ─────────────────────────────────────────────────

  const openPayDialog = (items, defaultAmount = "") => {
    setPayDialog({
      open: true,
      items,
      amount: String(defaultAmount),
      method: "Chuyển khoản",
      note: "",
    });
  };

  const closePayDialog = () => setPayDialog(EMPTY_PAY_DIALOG);

  const updatePayDialog = (field, value) =>
    setPayDialog((prev) => ({ ...prev, [field]: value }));

  const handleConfirmPay = async () => {
    const amount = toNumber(payDialog.amount);
    if (amount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    const items = payDialog.items;
    const isBulk = items.length > 1;
    const totalDebt = items.reduce((sum, x) => sum + toNumber(x.soTienNo), 0);

    if (amount > totalDebt) {
      alert("Số tiền thanh toán không được vượt quá tổng nợ.");
      return;
    }

    let paymentRecords = [];

    if (!isBulk) {
      paymentRecords = [
        {
          id: 0,
          isNhaCungCap: true,
          conNoID: items[0].idCongNo,
          soTien: amount,
          phuongThucThanhToan: payDialog.method === "Chuyển khoản",
          ngayThanhToan: new Date().toISOString(),
          ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
        },
      ];
    } else {
      if (amount === totalDebt) {
        paymentRecords = items.map((item) => ({
          id: 0,
          isNhaCungCap: true,
          conNoID: item.idCongNo,
          soTien: toNumber(item.soTienNo),
          phuongThucThanhToan: payDialog.method === "Chuyển khoản",
          ngayThanhToan: new Date().toISOString(),
          ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
        }));
      } else {
        let remaining = amount;
        const proportions = items.map((item) => ({
          item,
          ratio: toNumber(item.soTienNo) / totalDebt,
        }));
        paymentRecords = proportions.map(({ item, ratio }) => {
          let allocated = Math.floor(amount * ratio);
          if (allocated < 0) allocated = 0;
          remaining -= allocated;
          return {
            id: 0,
            isNhaCungCap: true,
            conNoID: item.idCongNo,
            soTien: allocated,
            phuongThucThanhToan: payDialog.method === "Chuyển khoản",
            ngayThanhToan: new Date().toISOString(),
            ghiChu: payDialog.note.trim() || "Thanh toán công nợ",
          };
        });
        if (remaining > 0) {
          const maxIndex = paymentRecords.reduce(
            (max, rec, idx) => (rec.soTien > paymentRecords[max].soTien ? idx : max),
            0
          );
          paymentRecords[maxIndex].soTien += remaining;
        }
      }
    }

    paymentRecords = paymentRecords.filter((record) => record.soTien > 0);
    if (paymentRecords.length === 0) {
      alert("Không có khoản thanh toán hợp lệ.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("http://localhost:5128/api/LichSuThanhToans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentRecords),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Thanh toán thất bại");
      }

      const maNcc = items[0]?.maNhaCungCap;
      invalidateCongNo(String(maNcc));
      invalidatePaymentHistory(String(maNcc));
      await fetchSuppliers();
      closePayDialog();
      alert("Đã ghi nhận thanh toán thành công.");
    } catch (err) {
      console.error(err);
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────────

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(search) ||
      s.email.toLowerCase().includes(q) ||
      s.maNhaCungCap.toLowerCase().includes(q)
    );
  });

  const { currentPage, totalPages, paginatedItems, goToPage, pageSize, setPageSize, totalItems } =
    usePagination(filteredSuppliers, 10);

  const totalDebt = suppliers.reduce((sum, s) => sum + toNumber(s.debt), 0);
  const totalPurchase = suppliers.reduce((sum, s) => sum + toNumber(s.totalPurchase), 0);

  // ─── Supplier form renderer ────────────────────────────────────────────────────

  const renderSupplierForm = (mode, supplier) => {
    const isEditMode = mode === "edit";
    return (
      <form
        onSubmit={(e) =>
          isEditMode && supplier ? handleSaveSupplier(e, supplier.id) : handleSaveNewSupplier(e)
        }
        className="space-y-5"
      >
        <div className="rounded-lg border bg-background p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold">
              {isEditMode ? "Chỉnh sửa thông tin nhà cung cấp" : "Thông tin nhà cung cấp mới"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Cập nhật thông tin liên hệ và ghi chú nội bộ."
                : "Nhập thông tin cơ bản để tạo nhà cung cấp mới."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`${mode}-name`}>Tên nhà cung cấp *</Label>
              <Input
                id={`${mode}-name`}
                value={formData.tenNcc}
                onChange={(e) => updateFormField("tenNcc", e.target.value)}
                placeholder="Nhập tên nhà cung cấp"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-phone`}>Số điện thoại *</Label>
              <Input
                id={`${mode}-phone`}
                value={formData.soDienThoai}
                onChange={(e) => updateFormField("soDienThoai", e.target.value)}
                placeholder="Nhập số điện thoại"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-email`}>Email</Label>
              <Input
                id={`${mode}-email`}
                type="email"
                value={formData.email}
                onChange={(e) => updateFormField("email", e.target.value)}
                placeholder="Nhập email"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`${mode}-address`}>Địa chỉ</Label>
              <Input
                id={`${mode}-address`}
                value={formData.diaChi}
                onChange={(e) => updateFormField("diaChi", e.target.value)}
                placeholder="Nhập địa chỉ nhà cung cấp"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`${mode}-notes`}>Ghi chú</Label>
              <Textarea
                id={`${mode}-notes`}
                value={formData.ghiChu}
                onChange={(e) => updateFormField("ghiChu", e.target.value)}
                placeholder="Nhập ghi chú (nếu có)"
                rows={3}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              if (isEditMode) setExpandedSupplierId(null);
              else setAddFormOpen(false);
            }}
          >
            Hủy
          </Button>
          {isEditMode && supplier && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeleteSupplier(supplier.id)}
              disabled={isSubmitting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa nhà cung cấp
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Lưu thay đổi" : "Thêm nhà cung cấp"}
          </Button>
        </div>
      </form>
    );
  };

  // ─── Loading / Error states ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Đang tải dữ liệu nhà cung cấp...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchSuppliers}>
          Thử lại
        </Button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý nhà cung cấp</h1>
        <p className="text-muted-foreground">Quản lý thông tin và công nợ nhà cung cấp</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng nhà cung cấp</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Truck className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng mua</p>
                <p className="text-2xl font-bold">{formatCurrencyVN(totalPurchase)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Phone className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nợ cần trả hiện tại</p>
                <p className="text-2xl font-bold">{formatCurrencyVN(totalDebt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã, tên, số điện thoại hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          {addFormOpen ? "Đóng form thêm" : "Thêm nhà cung cấp"}
        </Button>
      </div>

      {/* Add form */}
      {addFormOpen && (
        <Card className="border-dashed shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">Thêm thông tin nhà cung cấp</h2>
              <p className="text-sm text-muted-foreground">
                Nhập thông tin cơ bản để tạo nhà cung cấp mới.
              </p>
            </div>
            {renderSupplierForm("create")}
          </CardContent>
        </Card>
      )}

      {/* Suppliers table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Mã nhà cung cấp</TableHead>
              <TableHead>Tên nhà cung cấp</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Nợ cần trả hiện tại</TableHead>
              <TableHead className="text-right">Tổng mua</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Truck className="h-8 w-8" />
                    <p>Không tìm thấy nhà cung cấp</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((supplier) => {
                const isExpanded = expandedSupplierId === supplier.id;

                return (
                  <Fragment key={supplier.id}>
                    <TableRow
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => handleToggleSupplier(supplier)}
                    >
                      <TableCell className="font-medium">{supplier.maNhaCungCap}</TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.phone}</TableCell>
                      <TableCell>{supplier.email || "--"}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            supplier.debt > 0
                              ? "font-medium text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {formatCurrencyVN(supplier.debt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyVN(supplier.totalPurchase)}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-6">
                            <Tabs
                              defaultValue="supplier-info"
                              className="rounded-lg border bg-background shadow-inner"
                              onValueChange={(val) => {
                                if (val === "cong-no") fetchCongNo(supplier.id);
                                if (val === "payment-history") fetchPaymentHistory(supplier.id);
                              }}
                            >
                              <div className="border-b px-4 pt-4">
                                <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit">
                                  <TabsTrigger value="supplier-info" className="px-4 py-2">
                                    Thông tin nhà cung cấp
                                  </TabsTrigger>
                                  <TabsTrigger value="cong-no" className="gap-2 px-4 py-2">
                                    <History className="h-4 w-4" />
                                    Công nợ
                                  </TabsTrigger>
                                  <TabsTrigger value="payment-history" className="gap-2 px-4 py-2">
                                    <CreditCard className="h-4 w-4" />
                                    Lịch sử thanh toán
                                  </TabsTrigger>
                                </TabsList>
                              </div>

                              {/* Tab: Thông tin */}
                              <TabsContent value="supplier-info" className="mt-0 space-y-5 p-4">
                                <SupplierInfoSummary supplier={supplier} />
                                {renderSupplierForm("edit", supplier)}
                              </TabsContent>

                              {/* Tab: Công nợ */}
                              <TabsContent value="cong-no" className="mt-0 p-4">
                                {(() => {
                                  const list = (congNoData[supplier.id] ?? []).filter(
                                    (x) => x.trangThaiNo !== "da_thanh_toan"
                                  );
                                  const totalDebtList = list.reduce(
                                    (s, x) => s + toNumber(x.soTienNo),
                                    0
                                  );

                                  return (
                                    <div className="space-y-4 rounded-lg border bg-background p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <h3 className="text-base font-semibold">
                                            Công nợ nhà cung cấp
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            Các khoản nợ phát sinh từ phiếu nhập hàng.
                                          </p>
                                        </div>
                                        <div className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                                          {list.length} khoản nợ
                                        </div>
                                      </div>

                                      {congNoLoading && congNoData[supplier.id] === undefined ? (
                                        <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                          <span>Đang tải công nợ...</span>
                                        </div>
                                      ) : (
                                        <div className="overflow-hidden rounded-md border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Mã phiếu</TableHead>
                                                <TableHead>Ngày phát sinh</TableHead>
                                                <TableHead>Kho nhập</TableHead>
                                                <TableHead>Người lập</TableHead>
                                                <TableHead className="text-right">
                                                  Tổng tiền nhập
                                                </TableHead>
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
                                                  <TableCell
                                                    colSpan={10}
                                                    className="h-20 text-center text-muted-foreground"
                                                  >
                                                    Không có khoản nợ nào
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                list.map((item) => (
                                                  <TableRow key={item.idCongNo}>
                                                    <TableCell className="font-medium">
                                                      PN{String(item.maPhieuNhap).padStart(4, "0")}
                                                    </TableCell>
                                                    <TableCell>
                                                      {new Date(item.ngayPhatSinh).toLocaleDateString(
                                                        "vi-VN"
                                                      )}
                                                    </TableCell>
                                                    <TableCell>{item.tenKhoNhap}</TableCell>
                                                    <TableCell>{item.tenNguoiLap}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                      {formatCurrencyVN(item.tongTienNhap)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                      {formatCurrencyVN(item.daThanhToanNcc)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-destructive">
                                                      {formatCurrencyVN(item.soTienNo)}
                                                    </TableCell>
                                                    <TableCell>
                                                      <StatusBadge
                                                        value={item.trangThaiNhapHang}
                                                        labelMap={TRANG_THAI_NHAP_LABEL}
                                                        colorMap={TRANG_THAI_NHAP_COLOR}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <StatusBadge
                                                        value={item.trangThaiNo}
                                                        labelMap={TRANG_THAI_NO_LABEL}
                                                        colorMap={TRANG_THAI_NO_COLOR}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                          openPayDialog([item], item.soTienNo)
                                                        }
                                                      >
                                                        Thanh toán
                                                      </Button>
                                                    </TableCell>
                                                  </TableRow>
                                                ))
                                              )}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}

                                      {list.length > 0 && (
                                        <div className="flex items-center justify-between gap-3 border-t pt-3">
                                          <p className="text-sm text-muted-foreground">
                                            Tổng nợ cần trả:{" "}
                                            <span className="font-semibold text-destructive">
                                              {formatCurrencyVN(totalDebtList)}
                                            </span>
                                          </p>
                                          <Button
                                            onClick={() => openPayDialog(list, totalDebtList)}
                                          >
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Thanh toán tất cả
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TabsContent>

                              {/* Tab: Lịch sử thanh toán - Dùng API mới */}
                              <TabsContent value="payment-history" className="mt-0 p-4">
                                {(() => {
                                  const history = paymentHistory[supplier.id] ?? [];
                                  return (
                                    <div className="space-y-4 rounded-lg border bg-background p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <h3 className="text-base font-semibold">
                                            Lịch sử thanh toán nhà cung cấp
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            Các phiếu nhập đã thanh toán (theo giao dịch)
                                          </p>
                                        </div>
                                        <div className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                                          {history.length} giao dịch
                                        </div>
                                      </div>

                                      {paymentHistoryLoading && paymentHistory[supplier.id] === undefined ? (
                                        <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                          <span>Đang tải lịch sử...</span>
                                        </div>
                                      ) : (
                                        <div className="overflow-hidden rounded-md border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Mã phiếu nhập</TableHead>
                                                <TableHead>Ngày thanh toán</TableHead>
                                                <TableHead>Kho nhập</TableHead>
                                                <TableHead className="text-right">Tổng tiền nhập</TableHead>
                                                <TableHead className="text-right">Số tiền thanh toán</TableHead>
                                                <TableHead className="text-right">Đã thanh toán</TableHead>
                                                <TableHead className="text-right">Còn nợ</TableHead>
                                                <TableHead>Phương thức</TableHead>
                                                <TableHead>Ghi chú</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {history.length === 0 ? (
                                                <TableRow>
                                                  <TableCell
                                                    colSpan={9}
                                                    className="h-20 text-center text-muted-foreground"
                                                  >
                                                    Chưa có giao dịch thanh toán nào
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                history.map((item, idx) => (
                                                  <TableRow key={idx}>
                                                    <TableCell className="font-medium">
                                                      PN{String(item.maPhieu).padStart(4, "0")}
                                                    </TableCell>
                                                    <TableCell>
                                                      {formatDateTime(item.ngayPhatSinh)}
                                                    </TableCell>
                                                    <TableCell>{item.khoNhap}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                      {formatCurrencyVN(item.tongTienNhap)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">
                                                      {formatCurrencyVN(item.soTienThanhToan)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      {formatCurrencyVN(item.tongDaThanhToan)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      {formatCurrencyVN(item.conNo)}
                                                    </TableCell>
                                                    <TableCell>{item.phuongThucThanhToan}</TableCell>
                                                    <TableCell className="max-w-xs truncate">
                                                      {item.ghiChu || "--"}
                                                    </TableCell>
                                                  </TableRow>
                                                ))
                                              )}
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
      <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
        {!loading && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Hiển thị</span>
            <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
            <span>/ {totalItems} nhà cung cấp</span>
          </p>
        )}
        <PaginationWrapper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>

      {/* Payment dialog */}
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