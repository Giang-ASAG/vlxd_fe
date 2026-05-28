"use client";

import { useState, useEffect } from "react";
import {
  FilePlus2, Loader2, Plus, Save, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductService, SupplierService, PurchaseOrderService } from "@/src/services/api-services";
import { getSession } from "@/src/auth/session";

const EMPTY_LINE = { 
  productId: "", 
  productName: "", 
  quantity: 1, 
  unitPrice: 0, 
  discount: 0, 
  unit: "" 
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(toNumber(value))}đ`;
}

function getUserId() {
  const id = Number(getSession()?.user?.sub);
  return Number.isFinite(id) && id > 0 ? id : 1;
}

export function PurchasePOS({ open, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [draft, setDraft] = useState({
    supplierId: "",
    receiptCode: "",
    paidNow: 0,
    note: "",
    lines: [{ ...EMPTY_LINE }],
  });

  useEffect(() => {
    if (open) {
      loadMasterData();
    }
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
    const code = (product.maSku ?? product.maSanPham ?? "").toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  const updateLine = (index, field, value) => {
    setDraft((prev) => {
      const lines = prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      );
      return { ...prev, lines };
    });
  };

  const chooseProduct = (index, product) => {
    updateLine(index, "productId", String(product.maSanPham ?? product.id));
    updateLine(index, "productName", product.tenSanPham ?? product.name ?? "");
    updateLine(index, "unitPrice", toNumber(product.giaNhapGanNhat ?? product.cost ?? 0));
    updateLine(index, "unit", product.donViChinh ?? product.unit ?? "");
    setShowProductDropdown(null);
    setProductSearch("");
  };

  const addLine = () => {
    setDraft((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_LINE }],
    }));
  };

  const removeLine = (index) => {
    setDraft((prev) => {
      const lines = prev.lines.filter((_, i) => i !== index);
      return {
        ...prev,
        lines: lines.length ? lines : [{ ...EMPTY_LINE }],
      };
    });
  };

  const draftTotal = draft.lines.reduce((sum, line) =>
    sum + Math.max(0, toNumber(line.quantity) * toNumber(line.unitPrice) - toNumber(line.discount)), 0);

  const handleSave = async () => {
    if (!draft.supplierId) {
      setError("Vui lòng chọn nhà cung cấp");
      return;
    }
    const validLines = draft.lines.filter((line) => line.productId && toNumber(line.quantity) > 0);
    if (validLines.length === 0) {
      setError("Vui lòng chọn ít nhất một sản phẩm");
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
      setDraft({
        supplierId: "",
        receiptCode: "",
        paidNow: 0,
        note: "",
        lines: [{ ...EMPTY_LINE }],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative h-[90vh] w-[95vw] max-w-[1400px] rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-xl font-bold">Tạo phiếu nhập hàng</h2>
            <p className="text-sm text-muted-foreground">Nhập thông tin sản phẩm và nhà cung cấp</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100%-130px)] gap-4 overflow-auto p-4">
          {/* Left - Product Table */}
          <div className="flex-1 space-y-4">
            {/* Supplier Selection */}
            <Card className="rounded-lg">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Nhà cung cấp <span className="text-destructive">*</span></Label>
                    <Select value={draft.supplierId} onValueChange={(value) => setDraft((p) => ({ ...p, supplierId: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Chọn nhà cung cấp" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => {
                          const id = String(supplier.maNcc ?? supplier.id);
                          return (
                            <SelectItem key={id} value={id}>
                              {supplier.tenNcc ?? supplier.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Mã phiếu nhập</Label>
                    <Input 
                      className="mt-1 bg-muted/30"
                      value={draft.receiptCode} 
                      placeholder="Tự động" 
                      disabled
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Table */}
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <FilePlus2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">Danh sách sản phẩm</span>
                  <Badge variant="secondary" className="ml-2">
                    {draft.lines.length} sản phẩm
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="mr-1 h-3 w-3" /> Thêm dòng
                </Button>
              </div>

              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead className="min-w-[260px]">Sản phẩm</TableHead>
                      <TableHead className="w-[100px] text-right">Số lượng</TableHead>
                      <TableHead className="w-[140px] text-right">Đơn giá</TableHead>
                      <TableHead className="w-[120px] text-right">Giảm giá</TableHead>
                      <TableHead className="w-[140px] text-right">Thành tiền</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.lines.map((line, index) => {
                      const lineTotal = toNumber(line.quantity) * toNumber(line.unitPrice) - toNumber(line.discount);
                      return (
                        <TableRow key={index} className="hover:bg-muted/20">
                          <TableCell className="text-center text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <Input
                                    placeholder="Tìm kiếm sản phẩm..."
                                    value={index === showProductDropdown ? productSearch : line.productName}
                                    onChange={(e) => {
                                      setShowProductDropdown(index);
                                      setProductSearch(e.target.value);
                                      if (!e.target.value) {
                                        updateLine(index, "productName", "");
                                        updateLine(index, "productId", "");
                                      }
                                    }}
                                    onFocus={() => setShowProductDropdown(index)}
                                    className="h-9"
                                  />
                                  {showProductDropdown === index && (
                                    <div className="absolute top-full left-0 z-10 mt-1 max-h-[240px] w-full overflow-auto rounded-md border bg-popover shadow-lg">
                                      {filteredProducts.length === 0 ? (
                                        <div className="p-3 text-center text-sm text-muted-foreground">
                                          Không tìm thấy sản phẩm
                                        </div>
                                      ) : (
                                        filteredProducts.map((product) => (
                                          <div
                                            key={product.maSanPham ?? product.id}
                                            className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted"
                                            onClick={() => chooseProduct(index, product)}
                                          >
                                            <div>
                                              <p className="text-sm font-medium">
                                                {product.tenSanPham ?? product.name}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                SKU: {product.maSku ?? product.maSanPham}
                                              </p>
                                            </div>
                                            <span className="text-sm font-semibold text-primary">
                                              {formatCurrency(product.giaNhapGanNhat ?? product.cost ?? 0)}
                                            </span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, "quantity", e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.discount}
                              onChange={(e) => updateLine(index, "discount", e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(lineTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => removeLine(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Right - Summary Panel */}
          <div className="w-[320px] shrink-0 space-y-4">
            <Card className="rounded-lg">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Ghi chú</Label>
                    <Textarea
                      value={draft.note}
                      placeholder="Ghi chú cho phiếu nhập..."
                      onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Thanh toán ngay</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
                      <Input
                        type="number"
                        value={draft.paidNow}
                        onChange={(e) => setDraft((p) => ({ ...p, paidNow: e.target.value }))}
                        className="pl-7 text-right"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tổng tiền hàng</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(draftTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Đã thanh toán</span>
                        <span className="tabular-nums">{formatCurrency(draft.paidNow)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="font-semibold">Cần trả NCC</span>
                        <span className="text-lg font-bold text-primary tabular-nums">
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

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 border-t bg-background p-4">
          <Button variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px] gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Đang lưu..." : "Hoàn thành"}
          </Button>
        </div>
      </div>
    </div>
  );
}