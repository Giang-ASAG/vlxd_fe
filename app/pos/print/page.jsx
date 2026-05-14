"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, PackagePlus, Printer, ScrollText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRINT_DRAFT,
  formatPrintCurrency,
  normalizePrintDraft,
  POS_PRINT_DRAFT_KEY,
} from "@/lib/pos-print";

function toNumber(value) {
  return Number(String(value).replace(/\D/g, "")) || 0;
}

function createEmptyItem() {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    unit: "",
    quantity: 1,
    price: 0,
  };
}

export default function POSPrintPage() {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      const storedDraft = window.localStorage.getItem(POS_PRINT_DRAFT_KEY);
      setDraft(storedDraft ? normalizePrintDraft(JSON.parse(storedDraft)) : normalizePrintDraft(DEFAULT_PRINT_DRAFT));
    } catch {
      setDraft(normalizePrintDraft(DEFAULT_PRINT_DRAFT));
    }
  }, []);

  useEffect(() => {
    if (!draft) return;

    window.localStorage.setItem(POS_PRINT_DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const computed = useMemo(() => {
    if (!draft) return null;

    const subtotal = draft.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const total = Math.max(0, subtotal - draft.discount);
    const amountPaid = draft.amountPaid;
    const shortfall = Math.max(0, total - amountPaid);
    const change = amountPaid > total ? amountPaid - total : 0;
    const totalQuantity = draft.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      total,
      amountPaid,
      shortfall,
      change,
      totalQuantity,
      documentCode: draft.template === "invoice" ? draft.invoiceCode : draft.deliveryCode,
      note: draft.template === "invoice" ? draft.invoiceNote : draft.deliveryNote,
      thirdSignerLabel: draft.template === "invoice" ? "Khách hàng" : "Người nhận hàng",
      middleSignerLabel: draft.template === "invoice" ? "Thu ngân" : "Thủ kho",
      metaTitle: draft.template === "invoice" ? "Thông tin thanh toán" : "Thông tin xuất kho",
      title: draft.template === "invoice" ? "HÓA ĐƠN BÁN HÀNG" : "PHIẾU XUẤT KHO",
    };
  }, [draft]);

  const updateField = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateItem = (id, field, value) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const removeItem = (id) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  if (!draft || !computed) {
    return null;
  }

  return (
    <div className="flex h-full bg-muted/30">
      <style>{`
        @media print {
          body {
            background: white !important;
          }

          .print-editor {
            display: none !important;
          }

          .print-preview-wrap {
            padding: 0 !important;
            background: white !important;
          }

          .print-sheet {
            max-width: none !important;
            min-height: auto !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <aside className="print-editor w-[390px] shrink-0 overflow-auto border-r bg-background">
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/pos">
                <ArrowLeft className="h-4 w-4" />
                Quay lại POS
              </Link>
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              In phiếu
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Loại phiếu</CardTitle>
              <CardDescription>Chọn mẫu cần in trước khi chỉnh sửa nội dung.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={draft.template}
                onValueChange={(value) => updateField("template", value)}
                className="grid gap-3"
              >
                <label
                  htmlFor="print-template-invoice"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    draft.template === "invoice" ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <RadioGroupItem id="print-template-invoice" value="invoice" className="mt-1" />
                  <div className="space-y-1">
                    <p className="font-medium">Hóa đơn</p>
                    <p className="text-sm text-muted-foreground">In chứng từ bán hàng cho khách.</p>
                  </div>
                  <FileText className="ml-auto h-4 w-4 text-muted-foreground" />
                </label>

                <label
                  htmlFor="print-template-delivery"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    draft.template === "delivery" ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <RadioGroupItem id="print-template-delivery" value="delivery" className="mt-1" />
                  <div className="space-y-1">
                    <p className="font-medium">Phiếu xuất kho</p>
                    <p className="text-sm text-muted-foreground">In phiếu giao hàng hoặc xuất kho.</p>
                  </div>
                  <ScrollText className="ml-auto h-4 w-4 text-muted-foreground" />
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Thông tin cửa hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store-name">Tên cửa hàng</Label>
                <Input
                  id="store-name"
                  value={draft.storeName}
                  onChange={(e) => updateField("storeName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-address">Địa chỉ</Label>
                <Input
                  id="store-address"
                  value={draft.storeAddress}
                  onChange={(e) => updateField("storeAddress", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-phone">Số điện thoại</Label>
                <Input
                  id="store-phone"
                  value={draft.storePhone}
                  onChange={(e) => updateField("storePhone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Thông tin phiếu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice-code">Số hóa đơn</Label>
                  <Input
                    id="invoice-code"
                    value={draft.invoiceCode}
                    onChange={(e) => updateField("invoiceCode", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-code">Số phiếu xuất kho</Label>
                  <Input
                    id="delivery-code"
                    value={draft.deliveryCode}
                    onChange={(e) => updateField("deliveryCode", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="created-at">Thời gian lập</Label>
                <Input
                  id="created-at"
                  value={draft.createdAt}
                  onChange={(e) => updateField("createdAt", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Phương thức thanh toán</Label>
                <Input
                  id="payment-method"
                  value={draft.paymentMethod}
                  onChange={(e) => updateField("paymentMethod", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Thông tin đối tượng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Tên khách hàng</Label>
                <Input
                  id="customer-name"
                  value={draft.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Số điện thoại</Label>
                  <Input
                    id="customer-phone"
                    value={draft.customerPhone}
                    onChange={(e) => updateField("customerPhone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiver-name">Người nhận hàng</Label>
                  <Input
                    id="receiver-name"
                    value={draft.receiverName}
                    onChange={(e) => updateField("receiverName", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-address">Địa chỉ</Label>
                <Textarea
                  id="customer-address"
                  value={draft.customerAddress}
                  onChange={(e) => updateField("customerAddress", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="created-by">Người lập phiếu</Label>
                  <Input
                    id="created-by"
                    value={draft.createdBy}
                    onChange={(e) => updateField("createdBy", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cashier-name">Thu ngân</Label>
                  <Input
                    id="cashier-name"
                    value={draft.cashierName}
                    onChange={(e) => updateField("cashierName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse-keeper-name">Thủ kho</Label>
                  <Input
                    id="warehouse-keeper-name"
                    value={draft.warehouseKeeperName}
                    onChange={(e) => updateField("warehouseKeeperName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-signer-name">Người ký bên nhận</Label>
                  <Input
                    id="customer-signer-name"
                    value={draft.customerSignerName}
                    onChange={(e) => updateField("customerSignerName", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Giá trị và ghi chú</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discount">Giảm giá</Label>
                  <Input
                    id="discount"
                    inputMode="numeric"
                    value={draft.discount ? String(draft.discount) : ""}
                    onChange={(e) => updateField("discount", toNumber(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount-paid">Khách đã trả</Label>
                  <Input
                    id="amount-paid"
                    inputMode="numeric"
                    value={draft.amountPaid ? String(draft.amountPaid) : ""}
                    onChange={(e) => updateField("amountPaid", toNumber(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-note">Ghi chú hóa đơn</Label>
                <Textarea
                  id="invoice-note"
                  value={draft.invoiceNote}
                  onChange={(e) => updateField("invoiceNote", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-note">Ghi chú phiếu xuất kho</Label>
                <Textarea
                  id="delivery-note"
                  value={draft.deliveryNote}
                  onChange={(e) => updateField("deliveryNote", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Hàng hóa</CardTitle>
                  <CardDescription>Bạn có thể chỉnh sửa từng dòng trước khi in.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <PackagePlus className="h-4 w-4" />
                  Thêm dòng
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {draft.items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Chưa có hàng hóa trong phiếu.
                </div>
              ) : (
                draft.items.map((item, index) => (
                  <div key={item.id} className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Dòng hàng {index + 1}</p>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Tên hàng</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Đơn vị</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Số lượng</Label>
                        <Input
                          inputMode="numeric"
                          value={String(item.quantity)}
                          onChange={(e) => updateItem(item.id, "quantity", toNumber(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Đơn giá</Label>
                        <Input
                          inputMode="numeric"
                          value={String(item.price)}
                          onChange={(e) => updateItem(item.id, "price", toNumber(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </aside>

      <main className="print-preview-wrap flex-1 overflow-auto p-6">
        <div className="print-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] border bg-white p-[14mm] shadow-xl">
          <section className="mb-5 grid grid-cols-[1.25fr_1fr] gap-4 border-b-2 border-foreground pb-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold uppercase tracking-[0.08em]">{draft.storeName}</h1>
              <p>{draft.storeAddress}</p>
              <p>Điện thoại: {draft.storePhone || "--"}</p>
            </div>
            <div className="space-y-1 text-right">
              <h2 className="text-2xl font-bold">{computed.title}</h2>
              <p>
                <strong>Số:</strong> {computed.documentCode}
              </p>
              <p>
                <strong>Thời gian:</strong> {draft.createdAt}
              </p>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl border p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">Thông tin khách hàng</p>
              <p className="font-semibold">{draft.customerName || "--"}</p>
              <p>SĐT: {draft.customerPhone || "--"}</p>
              <p>Địa chỉ: {draft.customerAddress || "--"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">{computed.metaTitle}</p>
              <p>
                <strong>Phương thức:</strong> {draft.paymentMethod || "--"}
              </p>
              <p>
                <strong>Số mặt hàng:</strong> {draft.items.length}
              </p>
              <p>
                <strong>Người lập:</strong> {draft.createdBy || "--"}
              </p>
              <p>
                <strong>Người nhận:</strong> {draft.receiverName || "--"}
              </p>
            </div>
          </section>

          <section className="mb-5">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border bg-muted px-3 py-2 text-left">STT</th>
                  <th className="border bg-muted px-3 py-2 text-left">Tên hàng</th>
                  <th className="border bg-muted px-3 py-2 text-left">DVT</th>
                  <th className="border bg-muted px-3 py-2 text-right">SL</th>
                  <th className="border bg-muted px-3 py-2 text-right">Đơn giá</th>
                  <th className="border bg-muted px-3 py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border px-3 py-8 text-center text-muted-foreground">
                      Chưa có hàng hóa
                    </td>
                  </tr>
                ) : (
                  draft.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border px-3 py-2 align-top">{index + 1}</td>
                      <td className="border px-3 py-2 align-top">{item.name || "--"}</td>
                      <td className="border px-3 py-2 align-top">{item.unit || "--"}</td>
                      <td className="border px-3 py-2 text-right align-top">{item.quantity}</td>
                      <td className="border px-3 py-2 text-right align-top">{formatPrintCurrency(item.price)}</td>
                      <td className="border px-3 py-2 text-right align-top">
                        {formatPrintCurrency(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="mb-5 ml-auto w-full max-w-[360px] rounded-xl border p-4 text-sm">
            {draft.template === "invoice" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 border-b border-dashed pb-2">
                  <span>Tạm tính</span>
                  <strong>{formatPrintCurrency(computed.subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-dashed pb-2">
                  <span>Giảm giá</span>
                  <strong>{formatPrintCurrency(draft.discount)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-dashed pb-2 text-base">
                  <span className="font-semibold">Tổng thanh toán</span>
                  <strong>{formatPrintCurrency(computed.total)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-dashed pb-2">
                  <span>Khách đã trả</span>
                  <strong>{formatPrintCurrency(computed.amountPaid)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Còn thiếu / Trả lại</span>
                  <strong>
                    {formatPrintCurrency(computed.shortfall > 0 ? computed.shortfall : computed.change)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 border-b border-dashed pb-2">
                  <span>Tổng số lượng</span>
                  <strong>{computed.totalQuantity}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-dashed pb-2">
                  <span>Số mặt hàng</span>
                  <strong>{draft.items.length}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-dashed pb-2 text-base">
                  <span className="font-semibold">Tổng giá trị xuất kho</span>
                  <strong>{formatPrintCurrency(computed.total)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Người nhận hàng</span>
                  <strong>{draft.receiverName || "--"}</strong>
                </div>
              </div>
            )}
          </section>

          <section className="mb-7 rounded-xl bg-muted/40 p-4 text-sm">
            {computed.note}
          </section>

          <section className="grid grid-cols-3 gap-6 pt-2 text-center text-sm">
            <div>
              <h4 className="mb-3 font-semibold uppercase">Người lập phiếu</h4>
              <div className="h-20" />
              <p>{draft.createdBy || "(Ky, ghi ro ho ten)"}</p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold uppercase">{computed.middleSignerLabel}</h4>
              <div className="h-20" />
              <p>{draft.template === "invoice" ? draft.cashierName || "--" : draft.warehouseKeeperName || "--"}</p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold uppercase">{computed.thirdSignerLabel}</h4>
              <div className="h-20" />
              <p>{draft.customerSignerName || "--"}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
