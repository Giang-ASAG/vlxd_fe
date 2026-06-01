"use client";

import { useEffect, useState } from "react";
import {
    CalendarDays, FilePlus2, Loader2, Save, Search, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ProductService, PurchaseOrderService, SupplierService } from "@/src/services/api-services";
import { getSession } from "@/src/auth/session";
import { formatCurrency, formatMoneyInput, parseMoneyInput, toNumber } from "@/lib/money";

function getUserId() {
    const id = Number(getSession()?.user?.sub);
    return Number.isFinite(id) && id > 0 ? id : 1;
}

function toDateTimeInputValue(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeDateTimeForApi(value) {
    if (!value) return toDateTimeInputValue();
    return value.length === 16 ? `${value}:00` : value;
}

const initialDraft = () => ({
    supplierId: "",
    supplierName: "",
    receiptCode: "",
    receiptDate: toDateTimeInputValue(),
    paidNow: 0,
    note: "",
    lines: [],
});

export function PurchasePOS({ open, onClose, onSuccess }) {
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [draft, setDraft] = useState(initialDraft);

    useEffect(() => {
        if (!open) return;
        loadMasterData();
        setDraft(initialDraft());
        setProductSearch("");
        setSupplierSearch("");
        setShowProductDropdown(false);
        setShowSupplierDropdown(false);
        setError(null);
    }, [open]);

    const loadMasterData = async () => {
        try {
            const [supplierRes, productRes] = await Promise.all([
                SupplierService.getAll(),
                ProductService.getAll(),
            ]);
            setSuppliers(supplierRes?.data ?? []);
            setProducts(productRes?.data ?? []);
        } catch (err) {
            console.error("Failed to load data:", err);
        }
    };

    const filteredProducts = products.filter((product) => {
        const search = productSearch.toLowerCase();
        const name = (product.tenSanPham ?? product.name ?? "").toLowerCase();
        const code = String(product.maSku ?? product.maSanPham ?? "").toLowerCase();
        return name.includes(search) || code.includes(search);
    });

    const filteredSuppliers = suppliers.filter((supplier) => {
        const search = supplierSearch.toLowerCase();
        const name = (supplier.tenNcc ?? supplier.name ?? "").toLowerCase();
        return name.includes(search);
    });

    const selectProduct = (product) => {
        const productId = String(product.maSanPham ?? product.id);
        const unitPrice = toNumber(product.giaNhapGanNhat ?? product.cost ?? 0);
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.some((line) => line.productId === productId)
                ? prev.lines.map((line) => line.productId === productId
                    ? { ...line, quantity: toNumber(line.quantity) + 1 }
                    : line)
                : [
                    ...prev.lines,
                    {
                        lineKey: `${productId}-${Date.now()}-${prev.lines.length}`,
                        productId,
                        quantity: 1,
                        unitPrice,
                        product: {
                            id: productId,
                            code: product.maSku ?? product.maSanPham ?? "",
                            name: product.tenSanPham ?? product.name ?? "",
                            unit: product.donViChinh ?? product.unit ?? "Cái",
                        },
                    },
                ],
        }));
        setProductSearch("");
        setShowProductDropdown(false);
    };

    const selectSupplier = (supplier) => {
        const id = String(supplier.maNcc ?? supplier.id ?? "");
        const name = supplier.tenNcc ?? supplier.name ?? "";
        setDraft((prev) => ({
            ...prev,
            supplierId: id,
            supplierName: name,
        }));
        setSupplierSearch(name);
        setShowSupplierDropdown(false);
    };

    const updateLine = (lineKey, field, value) => {
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.map((line) => line.lineKey === lineKey ? { ...line, [field]: value } : line),
        }));
    };

    const removeLine = (lineKey) => {
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.filter((line) => line.lineKey !== lineKey),
        }));
    };

    const lineTotal = (line) => toNumber(line.quantity) * toNumber(line.unitPrice);
    const draftTotal = draft.lines.reduce((sum, line) => sum + lineTotal(line), 0);

    const handleSave = async () => {
        if (!draft.supplierId) {
            setError("Vui lòng chọn nhà cung cấp");
            return;
        }

        const validLines = draft.lines.filter((line) => line.productId && toNumber(line.quantity) > 0);
        if (!validLines.length) {
            setError("Vui lòng chọn ít nhất một sản phẩm và nhập số lượng hợp lệ");
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const receiptCode = String(draft.receiptCode ?? "").trim();
            const receiptPayload = receiptCode && Number.isFinite(Number(receiptCode))
                ? { maPhieuNhap: Number(receiptCode) }
                : {};

            // API expects a different payload shape (chiTiets, maKhoNhap, maNguoiLap)
            await PurchaseOrderService.create({
                ...receiptPayload,
                maNcc: Number(draft.supplierId),
                maKhoNhap: 1,
                maNguoiLap: getUserId(),
                ngayNhap: normalizeDateTimeForApi(draft.receiptDate),
                ghiChu: draft.note,
                soTienThanhToanNgay: toNumber(draft.paidNow),
                chiTiets: validLines.map((line) => ({
                    maSanPham: Number(line.productId),
                    soLuong: toNumber(line.quantity),
                    giaNhap: toNumber(line.unitPrice),
                })),
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err?.message ?? "Không thể lưu phiếu nhập");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative flex h-[90vh] w-[96vw] max-w-[1280px] flex-col overflow-hidden rounded-lg bg-background shadow-xl">
                <div className="shrink-0 border-b p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">Tạo phiếu nhập hàng</h2>
                            <p className="text-sm text-muted-foreground">Nhập thông tin sản phẩm và nhà cung cấp</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="min-w-0 space-y-4 overflow-y-auto pr-1">
                        <Card className="rounded-lg">
                            <CardContent className="p-4">
                                <Label className="text-sm font-semibold">Tìm kiếm hàng hóa</Label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Nhập tên hàng hóa hoặc SKU..."
                                        value={productSearch}
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                            setShowProductDropdown(true);
                                        }}
                                        onFocus={() => setShowProductDropdown(true)}
                                        className="pl-9"
                                    />
                                    {showProductDropdown && productSearch && (
                                        <div className="absolute left-0 top-full z-10 mt-1 max-h-[300px] w-full overflow-auto rounded-md border bg-popover shadow-lg">
                                            {filteredProducts.length === 0 ? (
                                                <div className="p-3 text-center text-sm text-muted-foreground">
                                                    Không tìm thấy sản phẩm
                                                </div>
                                            ) : (
                                                filteredProducts.map((product) => (
                                                    <button
                                                        type="button"
                                                        key={product.maSanPham ?? product.id}
                                                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
                                                        onClick={() => selectProduct(product)}
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-medium">
                                                                {product.tenSanPham ?? product.name}
                                                            </span>
                                                            <span className="block truncate text-xs text-muted-foreground">
                                                                Mã: {product.maSku ?? product.maSanPham} | ĐVT: {product.donViChinh ?? product.unit ?? "Cái"}
                                                            </span>
                                                        </span>
                                                        <span className="shrink-0 text-sm font-semibold text-primary">
                                                            {formatCurrency(product.giaNhapGanNhat ?? product.cost ?? 0)}
                                                        </span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {draft.lines.length > 0 && (
                            <div className="rounded-lg border">
                                <div className="flex items-center gap-2 border-b bg-muted/30 p-3">
                                    <FilePlus2 className="h-4 w-4 text-primary" />
                                    <span className="font-medium">Thông tin sản phẩm</span>
                                </div>

                                <div className="overflow-x-auto p-4">
                                    <Table className="min-w-[760px] table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[120px]">Mã hàng</TableHead>
                                                <TableHead>Tên hàng</TableHead>
                                                <TableHead className="w-[100px]">ĐVT</TableHead>
                                                <TableHead className="w-[120px] text-right">Số lượng</TableHead>
                                                <TableHead className="w-[140px] text-right">Đơn giá</TableHead>
                                                <TableHead className="w-[140px] text-right">Thành tiền</TableHead>
                                                <TableHead className="w-[64px]" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {draft.lines.map((line) => (
                                                <TableRow key={line.lineKey}>
                                                    <TableCell className="truncate font-mono text-xs">
                                                        {line.product.code || "--"}
                                                    </TableCell>
                                                    <TableCell className="truncate font-medium">
                                                        {line.product.name}
                                                    </TableCell>
                                                    <TableCell className="truncate">
                                                        {line.product.unit}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={line.quantity}
                                                            onChange={(e) => updateLine(line.lineKey, "quantity", e.target.value)}
                                                            className="h-9 w-[104px] text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            inputMode="numeric"
                                                            value={formatMoneyInput(line.unitPrice)}
                                                            onChange={(e) => updateLine(line.lineKey, "unitPrice", parseMoneyInput(e.target.value))}
                                                            className="h-9 w-[124px] text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="truncate text-right font-semibold text-primary tabular-nums">
                                                        {formatCurrency(lineTotal(line))}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeLine(line.lineKey)}
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 overflow-y-auto">
                        <Card className="rounded-lg">
                            <CardContent className="p-4">
                                <div className="space-y-4">
                                    <div className="space-y-2 border-b pb-3">
                                        <Label className="text-sm font-semibold">Ngày giờ nhập</Label>
                                        <div className="relative">
                                            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="datetime-local"
                                                step="1"
                                                value={draft.receiptDate}
                                                onChange={(e) => setDraft((p) => ({ ...p, receiptDate: e.target.value }))}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 border-b pb-3">
                                        <Label className="text-sm font-semibold">Nhà cung cấp</Label>
                                        <div className="relative w-full">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder="Tìm theo tên nhà cung cấp..."
                                                value={supplierSearch}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSupplierSearch(value);
                                                    setShowSupplierDropdown(true);
                                                    setDraft((p) => ({
                                                        ...p,
                                                        supplierId: value === p.supplierName ? p.supplierId : "",
                                                        supplierName: value === p.supplierName ? p.supplierName : "",
                                                    }));
                                                }}
                                                onFocus={() => setShowSupplierDropdown(true)}
                                                className="pl-9 text-left"
                                            />
                                            {showSupplierDropdown && supplierSearch && (
                                                <div className="absolute right-0 top-full z-10 mt-1 max-h-[200px] w-full overflow-auto rounded-md border bg-popover shadow-lg">
                                                    {filteredSuppliers.length === 0 ? (
                                                        <div className="p-2 text-center text-sm text-muted-foreground">
                                                            Không tìm thấy nhà cung cấp
                                                        </div>
                                                    ) : (
                                                        filteredSuppliers.map((supplier) => {
                                                            const id = supplier.maNcc ?? supplier.id;
                                                            const name = supplier.tenNcc ?? supplier.name ?? "";
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={id}
                                                                    className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-muted"
                                                                    onClick={() => selectSupplier(supplier)}
                                                                >
                                                                    <span className="block text-sm font-medium">{name}</span>
                                                                    <span className="block text-xs text-muted-foreground">Mã NCC: {id}</span>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 border-b pb-3">
                                        <Label className="text-sm font-semibold">Mã phiếu nhập</Label>
                                        <Input
                                            disabled
                                            value={draft.receiptCode}
                                            placeholder="Mã phiếu tự động"
                                            onChange={(e) => setDraft((p) => ({ ...p, receiptCode: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Ghi chú</Label>
                                        <Textarea
                                            className="resize-none"
                                            value={draft.note}
                                            placeholder="Ghi chú cho phiếu nhập..."
                                            onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2 border-b pb-3">
                                        <Label className="text-sm font-semibold">Thanh toán ngay</Label>
                                        <div className="relative">
                                            <Input
                                                inputMode="numeric"
                                                value={formatMoneyInput(draft.paidNow)}
                                                onChange={(e) => setDraft((p) => ({ ...p, paidNow: parseMoneyInput(e.target.value) }))}
                                                className="pl-7 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-muted/30 p-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="text-[12px] text-muted-foreground">Tổng tiền hàng</span>
                                                <span className="truncate text-[12px] font-semibold tabular-nums">{formatCurrency(draftTotal)}</span>
                                            </div>
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="text-[12px] text-muted-foreground">Đã thanh toán</span>
                                                <span className="truncate text-[12px] tabular-nums">{formatCurrency(draft.paidNow)}</span>
                                            </div>
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="shrink-0 text-[14px] font-bold text-red-700">Cần trả NCC</span>
                                                <span className="truncate text-[14px] font-semibold text-red-700 tabular-nums">
                                                    {formatCurrency(draftTotal - toNumber(draft.paidNow))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t bg-background p-4">
                    <Button variant="outline" onClick={onClose} className="h-10 w-[112px] shrink-0 whitespace-nowrap">
                        Hủy bỏ
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="h-10 w-[132px] shrink-0 gap-2 whitespace-nowrap">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? "Đang lưu..." : "Hoàn thành"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
