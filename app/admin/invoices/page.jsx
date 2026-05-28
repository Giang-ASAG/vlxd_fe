"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle, ChevronDown, Copy, Download, Edit3, FileText,
  Filter, Loader2, MoreHorizontal, Plus, Printer, Search, Save, X,
  Trash2, CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { normalizePrintDraft, POS_PRINT_DRAFT_KEY } from "@/lib/pos-print";
import { PageSizeSelect } from "@/src/admin/page-size-select";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { usePagination } from "@/src/hooks/use-pagination";
import { InvoiceService, CongNoKhachHangService } from "@/src/services/api-services";
import api from "@/src/lib/api-client";

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

  const pad = (n) => String(n).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString('vi-VN');
}

function toDateTimeLocalValue(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  const paid = toNumber(order?.soTienTra ?? order?.khachDaTra);
  const id = order?.maDonHang ?? order?.id ?? "";
  const createdAt = order?.ngayTao ?? order?.ngayBan ?? order?.createdAt;
  const paymentMethod = order?.hinhThuc === true ? "Chuyển khoản" : "Tiền mặt";

  return {
    raw: order,
    id: String(id),
    code: id ? `HD${String(id).padStart(6, "0")}` : "--",
    returnCode: order?.maTraHang ? `TH${String(order.maTraHang).padStart(6, "0")}` : "",
    customerCode: order?.maKhachHang ? `KH${String(order.maKhachHang).padStart(6, "0")}` : "--",
    customer: order?.tenKhachHang || "Khách lẻ",
    phone: order?.soDienThoai ?? order?.sdt ?? "",
    address: order?.diaChi ?? order?.diaChiGiaoHang ?? "",
    note: order?.ghiChu ?? "",
    createdAt,
    createdAtLabel: formatDateTime(createdAt),
    total,
    discount: toNumber(order?.giamGia ?? order?.giamGiaHoaDon),
    paid,
    debt: Math.max(0, total - paid),
    status: statusMap[order?.trangThaiThanhToan] ?? (paid >= total ? "completed" : paid > 0 ? "partial" : "pending"),
    createdBy: order?.tenNguoiTao ?? order?.tenNguoiBan ?? "--",
    seller: order?.tenNguoiBan ?? order?.tenNguoiTao ?? "--",
    channel: order?.kenhBan ?? "Bán trực tiếp",
    priceBook: order?.bangGia ?? "Bảng giá chung",
    paymentMethod,
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
        "Số điện thoại": invoice.phone,
        "Địa chỉ": invoice.address,
        "Tổng tiền hàng": invoice.total,
        "Giảm giá": invoice.discount,
        "Khách đã trả": invoice.paid,
        "Công nợ": invoice.debt,
        "Trạng thái": statusConfig[invoice.status].label,
        "Ghi chú": invoice.note,
      }];
    }

    return invoice.details.map((item, index) => ({
      "Mã hóa đơn": invoice.code,
      "Thời gian": invoice.createdAtLabel,
      "Mã KH": invoice.customerCode,
      "Khách hàng": invoice.customer,
      "Số điện thoại": invoice.phone,
      "Địa chỉ": invoice.address,
      "STT SP": index + 1,
      "Mã hàng": itemCode(item),
      "Tên hàng": itemName(item),
      "Số lượng": itemQty(item),
      "Đơn giá": itemUnitPrice(item),
      "Thành tiền": itemTotal(item),
      "Tổng tiền hàng": invoice.total,
      "Giảm giá": invoice.discount,
      "Khách đã trả": invoice.paid,
      "Công nợ": invoice.debt,
      "Trạng thái": statusConfig[invoice.status].label,
      "Ghi chú": invoice.note,
    }));
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoa don");
  XLSX.writeFile(wb, "hoa-don.xlsx");
}

function createInvoiceText(invoice) {
  const lines = [
    `Hóa đơn: ${invoice.code}`,
    `Ngày bán: ${invoice.createdAtLabel}`,
    `Khách hàng: ${invoice.customer}`,
    invoice.phone ? `SĐT: ${invoice.phone}` : "",
    invoice.address ? `Địa chỉ: ${invoice.address}` : "",
    `Thanh toán: ${invoice.paymentMethod}`,
    "",
    "Hàng hóa:",
    ...invoice.details.map((item, index) => `${index + 1}. ${itemName(item)} - SL: ${itemQty(item)} - Đơn giá: ${formatCurrency(itemUnitPrice(item))} - Thành tiền: ${formatCurrency(itemTotal(item))}`),
    "",
    `Tổng tiền hàng: ${formatCurrency(invoice.total)}`,
    `Giảm giá: ${formatCurrency(invoice.discount)}`,
    `Khách cần trả: ${formatCurrency(invoice.total - invoice.discount)}`,
    `Khách đã trả: ${formatCurrency(invoice.paid)}`,
    invoice.note ? `\nGhi chú: ${invoice.note}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function createPrintDraftFromInvoice(invoice) {
  return normalizePrintDraft({
    template: "invoice",
    invoiceCode: invoice.code,
    deliveryCode: invoice.returnCode || `PXK-${invoice.id}`,
    createdAt: invoice.createdAtLabel,
    paymentMethod: invoice.paymentMethod,
    createdBy: invoice.createdBy,
    cashierName: invoice.seller,
    receiverName: invoice.customer,
    customerSignerName: invoice.customer,
    customerName: invoice.customer,
    customerPhone: invoice.phone,
    customerAddress: invoice.address,
    discount: invoice.discount,
    amountPaid: invoice.paid,
    items: invoice.details.map((item, index) => ({
      id: `${invoice.id}-${index}`,
      name: itemName(item),
      unit: item?.donViTinh ?? item?.unit ?? "",
      quantity: itemQty(item),
      price: itemUnitPrice(item),
    })),
  });
}

// Component thanh toán công nợ
function PaymentModal({ isOpen, onClose, debtInfo, onSuccess, invoiceId }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(false); // false: tiền mặt, true: chuyển khoản
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    // Validate
    if (!amount || Number(amount) <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    if (Number(amount) > debtInfo.soTienNo) {
      setError(`Số tiền thanh toán không được vượt quá số tiền nợ (${formatCurrency(debtInfo.soTienNo)})`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        ma_cn: debtInfo.id,
        sotien: Number(amount),
        ghichu: note || "Thanh toán công nợ",
        pttt: paymentMethod,
        ngaythanhtoan: new Date().toISOString()
      };

      const response = await api.post("/CongNoKhachHang/thanh-toan-hoa-don", payload);
      
      if (response?.data?.success || response?.success) {
        onSuccess();
        onClose();
        // Reset form
        setAmount("");
        setNote("");
        setPaymentMethod(false);
        setError("");
      } else {
        setError("Thanh toán thất bại, vui lòng thử lại");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err?.response?.data?.message || "Đã xảy ra lỗi khi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  if (!debtInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán công nợ</DialogTitle>
          <DialogDescription>
            Thanh toán cho đơn hàng {invoiceId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số tiền còn nợ:</span>
              <span className="font-semibold text-red-600">{formatCurrency(debtInfo.soTienNo)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền thanh toán *</Label>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setAmount(value);
                setError("");
              }}
              placeholder="Nhập số tiền cần thanh toán"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Phương thức thanh toán</Label>
            <Select
              value={paymentMethod ? "chuyen_khoan" : "tien_mat"}
              onValueChange={(v) => setPaymentMethod(v === "chuyen_khoan")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tien_mat">Tiền mặt</SelectItem>
                <SelectItem value="chuyen_khoan">Chuyển khoản</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú (nếu có)"
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="mr-2 h-4 w-4" />
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Thanh toán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Component hiển thị lịch sử thanh toán
function PaymentHistory({ invoiceId }) {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!invoiceId) return;

    const fetchPaymentHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await CongNoKhachHangService.lichSuThanhToanHoaDon(invoiceId);
        
        if (response?.success === true && Array.isArray(response.data)) {
          setPaymentHistory(response.data);
        } else if (response?.data && Array.isArray(response.data)) {
          setPaymentHistory(response.data);
        } else {
          setPaymentHistory([]);
        }
      } catch (err) {
        console.error("Error fetching payment history:", err);
        setError("Đã xảy ra lỗi khi tải lịch sử thanh toán");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        <AlertCircle className="mr-2 h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (paymentHistory.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Chưa có lịch sử thanh toán
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Ngày thanh toán</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead>Phương thức</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentHistory.map((payment, index) => (
              <TableRow key={payment.id || index}>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(payment.ngayThanhToan)}
                </TableCell>
                <TableCell className="text-right font-semibold text-emerald-600">
                  {formatCurrency(payment.soTien)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={payment.phuongThucThanhToan ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}>
                    {payment.phuongThucThanhToan ? "Chuyển khoản" : "Tiền mặt"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {payment.ghiChu === "thanh_toan_mot_phan" ? "Thanh toán một phần" : payment.ghiChu || "--"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Component hiển thị thông tin công nợ
function DebtInfo({ invoiceId, onPaymentSuccess }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchDebtInfo = async () => {
    if (!invoiceId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await CongNoKhachHangService.congNoTheoHoaDon(invoiceId);
      
      // Xử lý response có cấu trúc { success: true, data: [...] }
      if (response?.success === true && Array.isArray(response.data)) {
        setDebts(response.data);
      } else if (response?.data && Array.isArray(response.data)) {
        setDebts(response.data);
      } else if (response?.data && !Array.isArray(response.data)) {
        setDebts([response.data]);
      } else {
        setDebts([]);
      }
    } catch (err) {
      console.error("Error fetching debt info:", err);
      setError("Đã xảy ra lỗi khi tải thông tin công nợ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtInfo();
  }, [invoiceId]);

  const handlePaymentClick = (debt) => {
    setSelectedDebt(debt);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchDebtInfo(); // Refresh danh sách công nợ
    if (onPaymentSuccess) {
      onPaymentSuccess(); // Gọi callback để refresh dữ liệu khác nếu cần
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'dang_no': return 'Đang nợ';
      case 'da_thanh_toan': return 'Đã thanh toán';
      case 'qua_han': return 'Quá hạn';
      default: return status || '--';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'dang_no': return 'text-red-600';
      case 'da_thanh_toan': return 'text-emerald-600';
      case 'qua_han': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        <AlertCircle className="mr-2 h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Không có thông tin công nợ
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Mã công nợ</TableHead>
              <TableHead className="text-right">Số tiền nợ</TableHead>
              <TableHead>Ngày phát sinh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell className="font-medium">{debt.id}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">
                  {formatCurrency(debt.soTienNo)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(debt.ngayPhatSinh)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("font-medium", getStatusColor(debt.trangThai))}>
                    {getStatusText(debt.trangThai)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePaymentClick(debt)}
                    disabled={debt.soTienNo === 0}
                    className="gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Thanh toán
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal thanh toán */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedDebt(null);
        }}
        debtInfo={selectedDebt}
        onSuccess={handlePaymentSuccess}
        invoiceId={invoiceId}
      />
    </div>
  );
}

// Component inline date editor
function InlineDateEditor({ invoice, onUpdate }) {
  const [dateValue, setDateValue] = useState(toDateTimeLocalValue(invoice.createdAt));
  const [originalValue, setOriginalValue] = useState(toDateTimeLocalValue(invoice.createdAt));
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleDateChange = (e) => {
    let newDateValue = e.target.value;

    const selectedDateStr = newDateValue.split('T')[0];
    const selectedDate = new Date(selectedDateStr);
    const today = new Date();

    if (selectedDate.toDateString() === today.toDateString()) {
      const hours = String(today.getHours()).padStart(2, '0');
      const minutes = String(today.getMinutes()).padStart(2, '0');
      newDateValue = `${selectedDateStr}T${hours}:${minutes}`;
      setDateValue(newDateValue);
    } else {
      setDateValue(newDateValue);
    }

    setIsDirty(true);
  };

  const handleSave = async () => {
    const nextDate = fromDateTimeLocalValue(dateValue);
    if (!nextDate) return;

    setSaving(true);
    try {
      const payload = {
        ...invoice.raw,
        ngayTao: nextDate,
      };

      await InvoiceService.update(invoice.id, payload);
      
      const updatedInvoice = {
        ...invoice,
        createdAt: nextDate,
        createdAtLabel: formatDateTime(nextDate),
        raw: payload,
      };
      onUpdate(updatedInvoice);
      
      setOriginalValue(dateValue);
      setIsDirty(false);
    } catch (err) {
      console.error("Update failed:", err);
      setDateValue(originalValue);
      alert("Cập nhật thất bại: " + (err?.message || "Vui lòng thử lại"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDateValue(originalValue);
    setIsDirty(false);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        value={dateValue}
        onChange={handleDateChange}
        onClick={(e) => e.stopPropagation()}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={saving}
      />
      {isDirty && (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-2 text-xs"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="h-7 px-2 text-xs"
          >
            Hủy
          </Button>
        </>
      )}
    </div>
  );
}

// Form chỉnh sửa hóa đơn
function EditInvoiceForm({ invoice, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    tenKhachHang: invoice.customer,
    soDienThoai: invoice.phone,
    diaChi: invoice.address,
    ghiChu: invoice.note,
    soTienTra: invoice.paid,
    hinhThuc: invoice.paymentMethod === "Chuyển khoản",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSoTienTraChange = (e) => {
    let value = e.target.value;
    if (value.startsWith('0') && value.length > 1) {
      value = value.replace(/^0+/, '');
    }
    if (value === '') {
      value = '0';
    }
    handleChange("soTienTra", toNumber(value));
  };

  const handleSoTienTraFocus = (e) => {
    if (e.target.value === '0' || e.target.value === 0) {
      handleChange("soTienTra", '');
    }
  };

  const handleSoTienTraBlur = (e) => {
    if (e.target.value === '' || e.target.value === undefined) {
      handleChange("soTienTra", 0);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const totalAfterDiscount = invoice.total;
      let trangThaiThanhToan = "chua_thanh_toan";

      if (formData.soTienTra >= totalAfterDiscount) {
        trangThaiThanhToan = "da_thanh_toan";
      } else if (formData.soTienTra > 0) {
        trangThaiThanhToan = "thanh_toan_mot_phan";
      }

      const payload = {
        maDonHang: Number(invoice.id),
        maKhachHang: invoice.raw?.maKhachHang || 0,
        maNguoiTao: invoice.raw?.maNguoiTao || 0,
        ngayTao: invoice.raw?.ngayTao,
        tongTien: invoice.total,
        trangThaiThanhToan: trangThaiThanhToan,
        hinhThuc: formData.hinhThuc,
        soTienTra: formData.soTienTra,
        tenKhachHang: formData.tenKhachHang,
        soDienThoai: formData.soDienThoai,
        diaChi: formData.diaChi,
        ghiChu: formData.ghiChu,
      };

      await InvoiceService.update(invoice.id, payload);
      onSave();
    } catch (err) {
      console.error("Update failed:", err);
      alert("Cập nhật thất bại: " + (err?.message || "Vui lòng thử lại"));
    } finally {
      setSaving(false);
    }
  };

  const totalAfterDiscount = invoice.total;
  const debt = Math.max(0, totalAfterDiscount - formData.soTienTra);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tenKhachHang">Tên khách hàng</Label>
          <Input
            id="tenKhachHang"
            value={formData.tenKhachHang}
            onChange={(e) => handleChange("tenKhachHang", e.target.value)}
            placeholder="Nhập tên khách hàng"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="soDienThoai">Số điện thoại</Label>
          <Input
            id="soDienThoai"
            value={formData.soDienThoai}
            onChange={(e) => handleChange("soDienThoai", e.target.value)}
            placeholder="Nhập số điện thoại"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="diaChi">Địa chỉ</Label>
          <Input
            id="diaChi"
            value={formData.diaChi}
            onChange={(e) => handleChange("diaChi", e.target.value)}
            placeholder="Nhập địa chỉ"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ghiChu">Ghi chú</Label>
          <Textarea
            id="ghiChu"
            value={formData.ghiChu}
            onChange={(e) => handleChange("ghiChu", e.target.value)}
            placeholder="Nhập ghi chú (nếu có)"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="soTienTra">Khách đã trả</Label>
          <Input
            id="soTienTra"
            type="text"
            inputMode="numeric"
            value={formData.soTienTra}
            onChange={handleSoTienTraChange}
            onFocus={handleSoTienTraFocus}
            onBlur={handleSoTienTraBlur}
            placeholder="0"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hinhThuc">Phương thức thanh toán</Label>
          <Select
            value={formData.hinhThuc ? "chuyen_khoan" : "tien_mat"}
            onValueChange={(v) => handleChange("hinhThuc", v === "chuyen_khoan")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tien_mat">Tiền mặt</SelectItem>
              <SelectItem value="chuyen_khoan">Chuyển khoản</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg bg-muted/30 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Tổng tiền hàng:</span>
            <span className="font-semibold">{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Khách cần trả:</span>
            <span className="font-bold text-primary">{formatCurrency(totalAfterDiscount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Khách đã trả:</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(formData.soTienTra)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Công nợ:</span>
            <span className={cn("font-semibold", debt > 0 ? "text-red-600" : "text-emerald-600")}>
              {formatCurrency(debt)}
            </span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu thay đổi
        </Button>
      </DialogFooter>
    </div>
  );
}

// Component chi tiết hóa đơn
function InvoiceDetail({ invoice, onCopy, onPrint, onUpdateInvoice, onEditInvoice }) {
  const [activeTab, setActiveTab] = useState("info");

  const handlePaymentSuccess = () => {
    // Refresh lại thông tin hóa đơn sau khi thanh toán thành công
    onUpdateInvoice(invoice);
  };

  return (
    <TableRow className="bg-background hover:bg-background">
      <TableCell colSpan={9} className="border-x border-b border-primary/30 p-0">
        <div className="space-y-5 px-6 py-5">
          <div className="border-b">
            <div className="flex gap-8">
              <button 
                className={cn(
                  "px-1 pb-3 text-sm font-semibold transition-colors",
                  activeTab === "info" 
                    ? "border-b-2 border-primary text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("info")}
              >
                Thông tin
              </button>
              <button 
                className={cn(
                  "px-1 pb-3 text-sm font-semibold transition-colors",
                  activeTab === "payment" 
                    ? "border-b-2 border-primary text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("payment")}
              >
                Lịch sử thanh toán
              </button>
              <button 
                className={cn(
                  "px-1 pb-3 text-sm font-semibold transition-colors",
                  activeTab === "debt" 
                    ? "border-b-2 border-primary text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("debt")}
              >
                Đang nợ
              </button>
            </div>
          </div>

          {/* Tab Thông tin */}
          {activeTab === "info" && (
            <>
              <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-bold">{invoice.customer}</span>
                    <span className="font-mono text-sm text-primary">{invoice.code}</span>
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
                      <InlineDateEditor
                        invoice={invoice}
                        onUpdate={onUpdateInvoice}
                      />
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
                    {invoice.phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Số điện thoại</p>
                        <p className="font-medium">{invoice.phone}</p>
                      </div>
                    )}
                    {invoice.address && (
                      <div>
                        <p className="text-xs text-muted-foreground">Địa chỉ</p>
                        <p className="font-medium">{invoice.address}</p>
                      </div>
                    )}
                    {invoice.note && (
                      <div>
                        <p className="text-xs text-muted-foreground">Ghi chú</p>
                        <p className="font-medium italic">{invoice.note}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">Chi nhánh trung tâm</p>
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
                        <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(itemTotal(item))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end border-t pt-6">
                <div className="w-full max-w-[420px] space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tổng tiền hàng (
                      {invoice.details.reduce((s, item) => s + itemQty(item), 0)})
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Giảm giá</span>
                    <span className="font-semibold text-red-600 tabular-nums">
                      -{formatCurrency(invoice.discount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Khách cần trả</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(invoice.total - invoice.discount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Khách đã trả</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {formatCurrency(invoice.paid)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Công nợ</span>
                    <span className={cn("font-semibold tabular-nums", invoice.debt > 0 ? "text-red-600" : "text-emerald-600")}>
                      {formatCurrency(invoice.debt)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tab Lịch sử thanh toán */}
          {activeTab === "payment" && (
            <PaymentHistory invoiceId={invoice.id} />
          )}

          {/* Tab Đang nợ */}
          {activeTab === "debt" && (
            <DebtInfo invoiceId={invoice.id} onPaymentSuccess={handlePaymentSuccess} />
          )}

          <div className="flex justify-between gap-2 border-t pt-4">
            <div className="flex flex-wrap items-center gap-2 self-end">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"><Trash2 className="h-4 w-4" /> Hủy</Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => onCopy(invoice)}><Copy className="h-4 w-4" /> Sao chép</Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => exportToExcel([invoice])}><Download className="h-4 w-4" /> Xuất file</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-end">
              <Button variant="outline" className="gap-2" onClick={() => onPrint(invoice)}><Printer className="h-4 w-4" /> In</Button>
              <Button className="gap-2" onClick={() => onEditInvoice(invoice)}>
                <Edit3 className="h-4 w-4" /> Chỉnh sửa
              </Button>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Component chính
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, invoice: null });

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await InvoiceService.getAll();
        const data = response?.data ?? [];
        const mapped = Array.isArray(data) ? data.map(mapDonHang) : [];
        setInvoices(mapped);
        if (mapped.length > 0) setExpandedId(mapped[0].id);
      } catch (err) {
        console.error("Error fetching invoices:", err);
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
        invoice.customerCode.toLowerCase().includes(q) ||
        invoice.phone.toLowerCase().includes(q);
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
    debt: filteredInvoices.reduce((sum, invoice) => sum + invoice.debt, 0),
  }), [filteredInvoices]);

  const showActionMessage = (type, text) => {
    setActionMessage({ type, text });
    window.setTimeout(() => setActionMessage(null), 3000);
  };

  const handleCopyInvoice = async (invoice) => {
    try {
      await navigator.clipboard.writeText(createInvoiceText(invoice));
      showActionMessage("success", `Đã sao chép ${invoice.code}`);
    } catch {
      showActionMessage("error", "Trình duyệt không cho phép sao chép tự động");
    }
  };

  const handlePrintInvoice = (invoice) => {
    window.localStorage.setItem(POS_PRINT_DRAFT_KEY, JSON.stringify(createPrintDraftFromInvoice(invoice)));
    const printWindow = window.open("/pos/print", "_blank");
    if (!printWindow) window.location.assign("/pos/print");
  };

  const handleUpdateInvoice = (updatedInvoice) => {
    setInvoices((items) =>
      items.map((item) => item.id === updatedInvoice.id ? updatedInvoice : item)
    );
    showActionMessage("success", `Đã cập nhật ngày bán ${updatedInvoice.code}`);
  };

  const openEditDialog = (invoice) => {
    setEditDialog({ open: true, invoice });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, invoice: null });
  };

  const handleSaveEdit = () => {
    closeEditDialog();
    showActionMessage("success", `Đã cập nhật thông tin hóa đơn ${editDialog.invoice?.code}`);
    // Refresh lại danh sách
    const fetchInvoices = async () => {
      try {
        const response = await InvoiceService.getAll();
        const data = response?.data ?? [];
        const mapped = Array.isArray(data) ? data.map(mapDonHang) : [];
        setInvoices(mapped);
      } catch (err) {
        console.error("Error refreshing invoices:", err);
      }
    };
    fetchInvoices();
  };

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

      {actionMessage && (
        <div className={cn(
          "rounded-md border px-4 py-3 text-sm",
          actionMessage.type === "error"
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Theo mã hóa đơn, tên khách hàng, SĐT hoặc mã KH..."
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
              <TableHead className="text-right">Khách đã trả</TableHead>
              <TableHead className="text-right">Công nợ</TableHead>
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
              <TableCell className="text-right tabular-nums">{formatCurrency(totals.paid)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(totals.debt)}</TableCell>
            </TableRow>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-36 text-center">
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
                  <TableCell className="font-semibold text-primary">{invoice.code}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.createdAtLabel}</TableCell>
                  <TableCell>{invoice.returnCode || ""}</TableCell>
                  <TableCell className="font-mono text-xs">{invoice.customerCode}</TableCell>
                  <TableCell className="font-medium">{invoice.customer}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(invoice.paid)}</TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", invoice.debt > 0 ? "text-red-600" : "text-emerald-600")}>
                    {formatCurrency(invoice.debt)}
                  </TableCell>
                </TableRow>
                {expandedId === invoice.id && (
                  <InvoiceDetail
                    invoice={invoice}
                    onCopy={handleCopyInvoice}
                    onPrint={handlePrintInvoice}
                    onUpdateInvoice={handleUpdateInvoice}
                    onEditInvoice={openEditDialog}
                  />
                )}
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

      {/* Dialog chỉnh sửa hóa đơn */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hóa đơn</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin hóa đơn {editDialog.invoice?.code ?? ""}
            </DialogDescription>
          </DialogHeader>

          {editDialog.invoice && (
            <EditInvoiceForm
              invoice={editDialog.invoice}
              onSave={handleSaveEdit}
              onCancel={closeEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}