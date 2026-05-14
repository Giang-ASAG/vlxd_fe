"use client";

import { Fragment, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  CreditCard,
  History,
  X,
  Package,
  CircleDollarSign,
  Wallet,
  BarChart3,
} from "lucide-react";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import { CustomerService } from "@/src/services/api-services";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  maKhachHang: "",
  hoTen: "",
  soDienThoai: "",
  diaChi: "",
  hanMucNo: "",
};

const EMPTY_PAY_DIALOG = {
  open: false,
  items: [],
  amount: "",
  method: "Chuyển khoản",
  note: "",
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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Thống kê giao dịch (bổ sung form chỉnh sửa, không trùng các trường nhập). */
function CustomerStatsStrip({ customer }) {
  const items = [
    {
      icon: Package,
      label: "Đơn hàng",
      value: new Intl.NumberFormat("vi-VN").format(toNumber(customer.totalOrders)),
    },
    {
      icon: CircleDollarSign,
      label: "Tổng mua",
      value: formatCurrency(customer.totalSpent),
    },
    {
      icon: Wallet,
      label: "Nợ hiện tại",
      value: formatCurrency(customer.tongConNo),
      valueClass:
        toNumber(customer.tongConNo) > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      icon: BarChart3,
      label: "Bán − trả hàng",
      value: formatCurrency(customer.netSales),
    },
  ];

  return (
    <div
      className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4"
      role="region"
      aria-label="Thống kê khách hàng"
    >
      {items.map(({ icon: Icon, label, value, valueClass }) => (
        <div
          key={label}
          className="min-w-[140px] shrink-0 snap-start rounded-xl border bg-card p-4 shadow-sm sm:min-w-0"
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{label}</span>
          </div>
          <p className={`truncate text-sm font-semibold tabular-nums ${valueClass ?? ""}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  let label = "Đang nợ";
  let color = "bg-destructive/10 text-destructive";
  if (status === "da_thanh_toan") {
    label = "Đã TT";
    color = "bg-green-100 text-green-700";
  } else if (status === "dang_no") {
    label = "Đang nợ";
    color = "bg-destructive/10 text-destructive";
  } else if (status === "cho_xu_ly") {
    label = "Chờ xử lý";
    color = "bg-yellow-100 text-yellow-700";
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl">
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Công nợ cache
  const [congNoData, setCongNoData] = useState({});
  const [congNoLoading, setCongNoLoading] = useState(false);

  // Lịch sử thanh toán cache (dữ liệu mới từ API)
  const [paymentHistory, setPaymentHistory] = useState({});
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);

  // Payment dialog
  const [payDialog, setPayDialog] = useState(EMPTY_PAY_DIALOG);

  // ─── API Calls ──────────────────────────────────────────────────────────────

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await CustomerService.getAll();
      if (!json.success) throw new Error("API trả về lỗi");

      const mapped = json.data.map((kh) => {
        const totalSpent = toNumber(kh.tongTienDonHang);
        const totalPaid = toNumber(kh.tongTienDaTra);
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
      console.error(err);
      setError(err.message ?? "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchCongNo = async (customerId) => {
    if (congNoData[customerId] !== undefined) return;
    setCongNoLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5128/api/CongNoKhachHang/khach-hang/${customerId}?pageNumber=1&pageSize=20`
      );
      const json = await res.json();
      setCongNoData((prev) => ({ ...prev, [customerId]: json.data ?? [] }));
    } catch (err) {
      console.error("Lỗi tải công nợ khách hàng:", err);
      setCongNoData((prev) => ({ ...prev, [customerId]: [] }));
    } finally {
      setCongNoLoading(false);
    }
  };

  const fetchPaymentHistory = async (customerId) => {
    if (paymentHistory[customerId] !== undefined) return;
    setPaymentHistoryLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5128/api/LichSuThanhToans/${customerId}?isNcc=false`
      );
      const json = await res.json();
      // Dữ liệu trả về nằm trong json.data, mỗi phần tử có các trường: maDonHang, ngayPhatSinh, soTienThanhToan, phuongThucThanhToan, ghiChu
      setPaymentHistory((prev) => ({ ...prev, [customerId]: json.data ?? [] }));
    } catch (err) {
      console.error("Lỗi tải lịch sử thanh toán:", err);
      setPaymentHistory((prev) => ({ ...prev, [customerId]: [] }));
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  const invalidateCongNo = (customerId) => {
    setCongNoData((prev) => {
      const next = { ...prev };
      delete next[String(customerId)];
      return next;
    });
  };

  const invalidatePaymentHistory = (customerId) => {
    setPaymentHistory((prev) => {
      const next = { ...prev };
      delete next[String(customerId)];
      return next;
    });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
  };

  // ─── Customer CRUD ─────────────────────────────────────────────────────────

  const handleAddClick = () => {
    setAddFormOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setExpandedId(null);
        resetForm();
      }
      return nextOpen;
    });
  };

  const handleToggleCustomer = (customer) => {
    setAddFormOpen(false);
    if (expandedId === customer.id) {
      setExpandedId(null);
      resetForm();
      return;
    }
    setExpandedId(customer.id);
    setFormData(createFormData(customer));
  };

  const handleSaveNewCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      maKhachHang: 0,
      hoTen: formData.hoTen.trim(),
      soDienThoai: formData.soDienThoai.trim(),
      diaChi: formData.diaChi.trim(),
      hanMucNo: toNumber(formData.hanMucNo),
    };
    try {
      await CustomerService.create(payload);
      await fetchCustomers();
      resetForm();
      setAddFormOpen(false);
    } catch (err) {
      console.error(err);
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCustomer = async (e, customerId) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      maKhachHang: customerId,
      hoTen: formData.hoTen.trim(),
      soDienThoai: formData.soDienThoai.trim(),
      diaChi: formData.diaChi.trim(),
      hanMucNo: toNumber(formData.hanMucNo),
    };
    try {
      await CustomerService.update(customerId, payload);
      await fetchCustomers();
      setExpandedId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!confirm("Bạn chắc chắn muốn xóa khách hàng này?")) return;
    try {
      setIsSubmitting(true);
      await CustomerService.delete(customerId);
      await fetchCustomers();
      setExpandedId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      const errorMsg = err.message || "";
      if (
        errorMsg.includes("ràng buộc") ||
        errorMsg.includes("constraint") ||
        errorMsg.includes("foreign")
      ) {
        alert(
          "⚠️ Không thể xóa khách hàng này!\n\nLý do: Khách hàng có đơn hàng hoặc dữ liệu liên quan."
        );
      } else {
        alert(`Lỗi: ${errorMsg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Payment Logic ─────────────────────────────────────────────────────────

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
          isNhaCungCap: false,
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
          isNhaCungCap: false,
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
            isNhaCungCap: false,
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

      const maKh = items[0]?.maKhachHang;
      invalidateCongNo(String(maKh));
      invalidatePaymentHistory(String(maKh));
      await fetchCustomers();
      closePayDialog();
      alert("Đã ghi nhận thanh toán thành công.");
    } catch (err) {
      console.error(err);
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderCustomerForm = (mode, customer = null) => {
    const isEdit = mode === "edit";

    const addressField = (
      <div className="space-y-2">
        <Label htmlFor={`${mode}-address`}>Địa chỉ</Label>
        <Textarea
          id={`${mode}-address`}
          value={formData.diaChi}
          onChange={(e) => updateFormField("diaChi", e.target.value)}
          placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố..."
          rows={isEdit ? 4 : 3}
          className="min-h-[88px] resize-y"
        />
      </div>
    );

    const cancelButton = (
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          resetForm();
          if (isEdit) setExpandedId(null);
          else setAddFormOpen(false);
        }}
      >
        Hủy
      </Button>
    );

    const submitButton = (
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Lưu thay đổi" : "Thêm khách hàng"}
      </Button>
    );

    const deleteButton =
      isEdit && customer ? (
        <Button
          type="button"
          variant="destructive"
          onClick={() => handleDeleteCustomer(customer.id)}
          disabled={isSubmitting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Xóa
        </Button>
      ) : null;

    const formFields = (
      <>
        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor={`${mode}-code`}>Mã khách hàng</Label>
            <Input
              id={`${mode}-code`}
              value={formData.maKhachHang}
              onChange={(e) => updateFormField("maKhachHang", e.target.value)}
              placeholder="Nhập mã"
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={`${mode}-name`}>Tên khách hàng *</Label>
          <Input
            id={`${mode}-name`}
            value={formData.hoTen}
            onChange={(e) => updateFormField("hoTen", e.target.value)}
            placeholder="Họ và tên"
            required
            autoComplete="name"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-phone`}>Số điện thoại *</Label>
            <Input
              id={`${mode}-phone`}
              type="tel"
              inputMode="tel"
              value={formData.soDienThoai}
              onChange={(e) => updateFormField("soDienThoai", e.target.value)}
              placeholder="0xxx xxx xxx"
              required
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-credit`}>Hạn mức nợ (đ)</Label>
            <Input
              id={`${mode}-credit`}
              type="number"
              min={0}
              step={1000}
              value={formData.hanMucNo}
              onChange={(e) => updateFormField("hanMucNo", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        {addressField}
      </>
    );

    if (isEdit && customer) {
      return (
        <div className="space-y-6">
          <CustomerStatsStrip customer={customer} />
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg">Chỉnh sửa thông tin</CardTitle>
                  <CardDescription>
                    Cập nhật liên hệ, địa chỉ và hạn mức nợ. Mã khách hàng không đổi.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit shrink-0 font-mono text-sm font-normal">
                  Mã KH · {customer.maKhachHang}
                </Badge>
              </div>
            </CardHeader>
            <form
              onSubmit={(e) => handleSaveCustomer(e, customer.id)}
              className="flex flex-col gap-0"
            >
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Liên hệ và tài chính
                  </p>
                  <Separator />
                  <div className="space-y-4 pt-1">{formFields}</div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col-reverse gap-3 border-t bg-muted/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full sm:w-auto sm:justify-start">{deleteButton}</div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                  {cancelButton}
                  {submitButton}
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      );
    }

    return (
      <form onSubmit={handleSaveNewCustomer} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="create-code">Mã khách hàng</Label>
            <Input
              id="create-code"
              value={formData.maKhachHang}
              onChange={(e) => updateFormField("maKhachHang", e.target.value)}
              placeholder="Nhập mã"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-name">Tên khách hàng *</Label>
            <Input
              id="create-name"
              value={formData.hoTen}
              onChange={(e) => updateFormField("hoTen", e.target.value)}
              placeholder="Họ và tên"
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-phone">Số điện thoại *</Label>
            <Input
              id="create-phone"
              type="tel"
              inputMode="tel"
              value={formData.soDienThoai}
              onChange={(e) => updateFormField("soDienThoai", e.target.value)}
              placeholder="0xxx xxx xxx"
              required
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-1">
            <Label htmlFor="create-credit">Hạn mức nợ (đ)</Label>
            <Input
              id="create-credit"
              type="number"
              min={0}
              step={1000}
              value={formData.hanMucNo}
              onChange={(e) => updateFormField("hanMucNo", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        {addressField}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
          {cancelButton}
          {submitButton}
        </div>
      </form>
    );
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(search) ||
      c.maKhachHang.toString().includes(search)
    );
  });

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    pageSize,
    setPageSize,
    totalItems,
  } = usePagination(filteredCustomers, 10);

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = customers.reduce((s, c) => s + c.totalOrders, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchCustomers}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý khách hàng</h1>
        <p className="text-muted-foreground">Quản lý thông tin và công nợ</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng khách hàng</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Phone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                <MapPin className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá trị đơn TB</p>
                <p className="text-2xl font-bold">{formatCurrency(Math.round(avgOrder))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã, tên, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          {addFormOpen ? "Đóng form" : "Thêm khách hàng"}
        </Button>
      </div>

      {/* Add Form */}
      {addFormOpen && (
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-6">{renderCustomerForm("create")}</CardContent>
        </Card>
      )}

      {/* Customers Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Mã KH</TableHead>
              <TableHead>Tên khách hàng</TableHead>
              <TableHead>SĐT</TableHead>
              <TableHead className="text-right">Nợ hiện tại</TableHead>
              <TableHead className="text-right">Tổng bán</TableHead>
              <TableHead className="text-right">Bán - trả hàng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Không tìm thấy khách hàng
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((customer) => {
                const expanded = expandedId === customer.id;
                return (
                  <Fragment key={customer.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => handleToggleCustomer(customer)}
                    >
                      <TableCell className="font-medium">{customer.maKhachHang}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell className="text-right">
                        <span className={customer.tongConNo > 0 ? "text-destructive font-medium" : ""}>
                          {formatCurrency(customer.tongConNo)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.netSales)}
                      </TableCell>
                    </TableRow>

                    {expanded && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-6">
                            <Tabs
                              defaultValue="info"
                              onValueChange={(val) => {
                                if (val === "debt") fetchCongNo(customer.id);
                                if (val === "history") fetchPaymentHistory(customer.id);
                              }}
                            >
                              <TabsList>
                                <TabsTrigger value="info">Thông tin</TabsTrigger>
                                <TabsTrigger value="debt" className="gap-1">
                                  <CreditCard className="h-4 w-4" /> Công nợ
                                </TabsTrigger>
                                <TabsTrigger value="history" className="gap-1">
                                  <History className="h-4 w-4" /> Lịch sử TT
                                </TabsTrigger>
                              </TabsList>

                              {/* Tab Thông tin */}
                              <TabsContent value="info" className="mt-4">
                                {renderCustomerForm("edit", customer)}
                              </TabsContent>

                              {/* Tab Công nợ */}
                              <TabsContent value="debt" className="mt-4">
                                {(() => {
                                  const list = (congNoData[customer.id] ?? []).filter(
                                    (x) => x.trangThaiNo !== "da_thanh_toan"
                                  );
                                  const total = list.reduce((s, x) => s + toNumber(x.soTienNo), 0);
                                  return (
                                    <div className="space-y-4 rounded-lg border p-4">
                                      <div className="flex justify-between">
                                        <div>
                                          <h3 className="font-semibold">Công nợ khách hàng</h3>
                                          <p className="text-sm text-muted-foreground">
                                            Các đơn hàng chưa thanh toán
                                          </p>
                                        </div>
                                        <div className="rounded-full border px-3 py-1 text-xs">
                                          {list.length} khoản nợ
                                        </div>
                                      </div>
                                      {congNoLoading && congNoData[customer.id] === undefined ? (
                                        <div className="flex h-24 items-center justify-center gap-2">
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                          <span>Đang tải công nợ...</span>
                                        </div>
                                      ) : (
                                        <div className="overflow-hidden rounded-md border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Mã đơn</TableHead>
                                                <TableHead>Ngày phát sinh</TableHead>
                                                <TableHead className="text-right">Tổng tiền</TableHead>
                                                <TableHead className="text-right">Đã thanh toán</TableHead>
                                                <TableHead className="text-right">Còn nợ</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                                <TableHead />
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {list.length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={7} className="h-20 text-center">
                                                    Không có khoản nợ nào
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                list.map((item) => (
                                                  <TableRow key={item.idCongNo}>
                                                    <TableCell className="font-medium">
                                                      {item.maDonHang}
                                                    </TableCell>
                                                    <TableCell>
                                                      {formatDate(item.ngayPhatSinh)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      {formatCurrency(item.tongTienDonHang)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                      {formatCurrency(item.soTienDaTra)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-destructive">
                                                      {formatCurrency(item.soTienNo)}
                                                    </TableCell>
                                                    <TableCell>
                                                      <StatusBadge status={item.trangThaiNo} />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openPayDialog([item], item.soTienNo)}
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
                                        <div className="flex justify-between border-t pt-3">
                                          <p className="text-sm">
                                            Tổng nợ:{" "}
                                            <span className="font-semibold text-destructive">
                                              {formatCurrency(total)}
                                            </span>
                                          </p>
                                          <Button onClick={() => openPayDialog(list, total)}>
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Thanh toán tất cả
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TabsContent>

                              {/* Tab Lịch sử thanh toán - dùng API mới */}
                              <TabsContent value="history" className="mt-4">
                                {(() => {
                                  const history = paymentHistory[customer.id] ?? [];
                                  return (
                                    <div className="space-y-4 rounded-lg border p-4">
                                      <div className="flex justify-between">
                                        <div>
                                          <h3 className="font-semibold">Lịch sử thanh toán</h3>
                                          <p className="text-sm text-muted-foreground">
                                            Các giao dịch thanh toán của khách hàng
                                          </p>
                                        </div>
                                        <div className="rounded-full border px-3 py-1 text-xs">
                                          {history.length} giao dịch
                                        </div>
                                      </div>
                                      {paymentHistoryLoading && paymentHistory[customer.id] === undefined ? (
                                        <div className="flex h-24 items-center justify-center gap-2">
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                          <span>Đang tải lịch sử...</span>
                                        </div>
                                      ) : (
                                        <div className="overflow-hidden rounded-md border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Mã đơn hàng</TableHead>
                                                <TableHead>Ngày thanh toán</TableHead>
                                                <TableHead className="text-right">Số tiền thanh toán</TableHead>
                                                <TableHead>Phương thức</TableHead>
                                                <TableHead>Ghi chú</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {history.length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={5} className="h-20 text-center">
                                                    Chưa có giao dịch thanh toán nào
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                history.map((record, idx) => (
                                                  <TableRow key={idx}>
                                                    <TableCell className="font-medium">
                                                      {record.maDonHang}
                                                    </TableCell>
                                                    <TableCell>
                                                      {formatDate(record.ngayPhatSinh)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">
                                                      {formatCurrency(record.soTienThanhToan)}
                                                    </TableCell>
                                                    <TableCell>
                                                      {record.phuongThucThanhToan || "Chuyển khoản"}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate">
                                                      {record.ghiChu || "--"}
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
      <div className="flex flex-col gap-4 px-2 sm:flex-row sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Hiển thị <PageSizeSelect pageSize={pageSize} onChange={setPageSize} /> / {totalItems} khách hàng
        </div>
        <PaginationWrapper currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* Payment Dialog */}
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