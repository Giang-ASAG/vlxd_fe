"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  Fragment,
} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Package,
  Loader2,
  RefreshCw,
  AlertCircle,
  History,
  Info,
  DollarSign,
  Warehouse,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProductService,
  CategoryService,
  SupplierService,
  PurchaseOrderService,
} from "@/src/services/api-services";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";

// ── Form / Select (Radix Select: value phải khớp đúng một SelectItem) ───────

const UNITS = [
  "Bao",
  "Cây",
  "Viên",
  "Khối",
  "Thùng",
  "Cuộn",
  "Cái",
  "Mét",
  "M3",
  "Tờ",
  "Lon",
];

const DEFAULT_UNIT = "Cái";

function trimUnit(u) {
  if (u === null || u === undefined) return "";
  return String(u).trim();
}

/** Chuỗi id cho Select — rỗng khi không có để khớp placeholder */
function toSelectIdString(v) {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

const EMPTY_FORM = {
  name: "",
  sku: "",
  maDanhMuc: "",
  maThuongHieu: "",
  price: "",
  priceBeforeTax: "",
  vat: "0",
  cost: "",
  stock: "0",
  tonKhoHienTai: "0",
  stockAdd: "0",
  tonKhoHienTaiAdd: "0",
  tonKhoToiThieu: "0",
  tonKhoToiDa: "999999999",
  unit: DEFAULT_UNIT,
  maNccMacDinh: "",
};

/** Generate SKU from product name: first letter of each word + 6 random digits */
function generateSkuFromName(name) {
  if (!name || typeof name !== "string") return "";
  const words = name.trim().split(/\s+/);
  const initials = words
    .map((w) => w.charAt(0).toUpperCase())
    .filter((c) => c.match(/[A-Z0-9]/))
    .join("");
  
  if (!initials) return "";
  
  const randomDigits = String(Math.floor(Math.random() * 1000000)).padStart(
    6,
    "0"
  );
  return `${initials}-${randomDigits}`;
}

const VAT_SELECT_VALUES = new Set(["0", "5", "8", "10"]);

function vatToSelectString(v) {
  const n = Math.round(
    Number(String(v).replace(",", ".").replace(/%/g, "").trim()) || 0
  );
  const direct = String(n);
  if (VAT_SELECT_VALUES.has(direct)) return direct;
  const allowed = [0, 5, 8, 10];
  const nearest = allowed.reduce((best, cur) =>
    Math.abs(cur - n) < Math.abs(best - n) ? cur : best
  );
  return String(nearest);
}

function reconcileVatSelectFromPrices(vatStr, priceBeforeTax, priceAfterListed) {
  const pbt = Number(priceBeforeTax) || 0;
  const post = Number(priceAfterListed) || 0;
  if (vatStr !== "0" || pbt <= 0 || post <= pbt + 2) return vatStr;
  for (const v of ["5", "8", "10"]) {
    const pct = Number(v);
    if (Math.abs(Math.round(pbt * (1 + pct / 100)) - post) <= 2) return v;
  }
  return vatStr;
}

function resolveCategorySelectValue(product, danhMucs) {
  if (!product || !Array.isArray(danhMucs) || danhMucs.length === 0)
    return "";
  const idSet = new Set(danhMucs.map((d) => String(d.maDanhMuc)));
  const raw =
    product.maDanhMuc ?? product.MaDanhMuc ?? product.maDanhMucId;
  if (raw != null && raw !== "" && idSet.has(String(raw)))
    return String(raw);
  const label =
    product.category ??
    product.tenDanhMuc ??
    product.TenDanhMuc ??
    product.tenNhomHang;
  if (label) {
    const hit = danhMucs.find((d) => d.tenDanhMuc === label);
    if (hit) return String(hit.maDanhMuc);
  }
  return raw != null && raw !== "" ? String(raw) : "";
}

function resolveSupplierSelectValue(product, suppliers) {
  if (!product || !Array.isArray(suppliers) || suppliers.length === 0)
    return "";
  const idSet = new Set(suppliers.map((s) => String(s.maNcc)));
  const raw =
    product.maNccMacDinh ??
    product.maNcc ??
    product.MaNccMacDinh ??
    product.MaNcc;
  if (raw != null && raw !== "" && idSet.has(String(raw)))
    return String(raw);
  const label =
    product.supplierName ??
    product.tenNcc ??
    product.TenNcc ??
    product.tenNhaCungCap ??
    product.TenNhaCungCap;
  if (label && label !== "Chưa có nhà cung cấp") {
    const hit = suppliers.find((s) => s.tenNcc === label);
    if (hit) return String(hit.maNcc);
  }
  return raw != null && raw !== "" ? String(raw) : "";
}

// ── Bảng / API mapping ─────────────────────────────────────────────────────

const statusConfig = {
  active: {
    label: "Còn hàng",
    className: "bg-success/10 text-success border-success/20",
  },
  low_stock: {
    label: "Sắp hết",
    className: "bg-warning/10 text-warning-foreground border-warning/20",
  },
  out_of_stock: {
    label: "Hết hàng",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function inferVatFromPrices(pre, post) {
  if (
    !Number.isFinite(pre) ||
    pre <= 0 ||
    !Number.isFinite(post) ||
    post < pre
  )
    return 0;

  const common = [0, 5, 8, 10];
  let best = 0;
  let bestDiff = Infinity;
  for (const v of common) {
    const diff = Math.abs(Math.round(pre * (1 + v / 100)) - post);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = v;
    }
  }
  if (bestDiff <= 2) return best;
  return 0;
}

function resolveVatPercentFromApi(p) {
  const raw = p.thue ?? p.Thue;
  const pre = Number(p.giaBanLe);
  const post = Number(p.giaSauThue);

  if (raw !== null && raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
    if (
      n === 0 &&
      Number.isFinite(pre) &&
      pre > 0 &&
      Number.isFinite(post) &&
      post > pre
    ) {
      const zeroVatMatch = Math.abs(Math.round(pre) - post) <= 2;
      if (!zeroVatMatch) return inferVatFromPrices(pre, post);
    }
    if (Number.isFinite(n) && n >= 0) return n;
  }

  return inferVatFromPrices(pre, post);
}

/**
 * Ánh xạ API → model nội bộ; các field dùng trong SelectTrigger
 * (maDanhMuc, maNccMacDinh, unit, thue/vat) được chuẩn hóa khớp SelectItem.
 */
function mapProduct(p, danhMucMap, supplierMap, dmList = [], supplierList = []) {
  const stock = p.soLuong ?? 0;
  const currentInventory = p.tonKhoHienTai ?? 0;
  let status = "active";
  if (stock === 0 || currentInventory === 0) status = "out_of_stock";
  else if (stock < 50 || currentInventory < 50) status = "low_stock";

  const vatPercent = resolveVatPercentFromApi(p);
  const rawDonVi = String(p.donViChinh ?? p.DonViChinh ?? "").trim();
  const unitForSelect = trimUnit(rawDonVi) || DEFAULT_UNIT;

  let maDanhMuc = p.maDanhMuc ?? p.MaDanhMuc ?? p.maDanhMucId;
  if ((maDanhMuc == null || maDanhMuc === "") && dmList.length) {
    const ten = p.tenDanhMuc ?? p.TenDanhMuc;
    if (ten) {
      const hit = dmList.find((d) => d.tenDanhMuc === ten);
      if (hit) maDanhMuc = hit.maDanhMuc;
    }
  }

  let maNccMacDinh =
    p.maNccMacDinh ?? p.maNcc ?? p.MaNccMacDinh ?? p.MaNcc;
  if ((maNccMacDinh == null || maNccMacDinh === "") && supplierList.length) {
    const ten = p.tenNcc ?? p.TenNcc ?? p.tenNhaCungCap ?? p.TenNhaCungCap;
    if (ten) {
      const hit = supplierList.find((s) => s.tenNcc === ten);
      if (hit) maNccMacDinh = hit.maNcc;
    }
  }

  const category =
    danhMucMap[maDanhMuc] ??
    danhMucMap[String(maDanhMuc)] ??
    "Khác";

  const supplierName =
    supplierMap[maNccMacDinh] ??
    supplierMap[String(maNccMacDinh)] ??
    "Chưa có nhà cung cấp";

  const tenDanhMucApi = p.tenDanhMuc ?? p.TenDanhMuc ?? null;
  const tenNccApi =
    p.tenNcc ?? p.TenNcc ?? p.tenNhaCungCap ?? p.TenNhaCungCap ?? null;

  return {
    id: p.maSanPham,
    name: p.tenSanPham,
    sku: p.maSku,
    maDanhMuc: toSelectIdString(maDanhMuc),
    maThuongHieu: p.maThuongHieu ?? p.MaThuongHieu ?? "",
    category,
    tenDanhMuc: tenDanhMucApi ?? category,
    price: p.giaSauThue,
    priceBeforeTax: p.giaBanLe,
    thue: vatPercent,
    vat: vatPercent,
    cost: p.giaNhapGanNhat,
    stock: p.soLuong,
    tonKhoHienTai: p.tonKhoHienTai,
    tonKhoToiThieu: p.tonKhoToiThieu,
    tonKhoToiDa: p.tonKhoToiDa,
    unit: unitForSelect,
    donViChinh: unitForSelect,
    maNccMacDinh: toSelectIdString(maNccMacDinh),
    supplierName,
    tenNcc: tenNccApi,
    ngayTao: p.ngayTao,
    status,
  };
}

function getPurchaseOrderLines(order) {
  const possibleKeys = [
    "sanPhamDtos",
    "chiTiet",
    "chiTietPhieuNhap",
    "chiTietPhieuNhaps",
    "danhSachChiTiet",
    "details",
    "items",
    "sanPhams",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(order?.[key])) return order[key];
  }

  return [];
}

function getLineProductId(line) {
  return (
    line?.maSanPham ??
    line?.sanPhamId ??
    line?.maHangHoa ??
    line?.productId
  );
}

function getProductPurchaseHistory(purchaseOrders, productId) {
  if (!productId) return [];

  return purchaseOrders.flatMap((order) => {
    const matchingLines = getPurchaseOrderLines(order).filter(
      (line) => Number(getLineProductId(line)) === Number(productId)
    );

    if (
      matchingLines.length === 0 &&
      Number(order?.maSanPham) === Number(productId)
    ) {
      return [{ order, line: order }];
    }

    return matchingLines.map((line) => ({ order, line }));
  });
}

function ProductPurchaseHistoryTab({
  product,
  suppliers,
  purchaseOrders,
  formatPrice,
  formatPurchaseStatus,
}) {
  const history = getProductPurchaseHistory(purchaseOrders, product.id);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">
            Lịch sử nhập của {product.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            Theo dõi các phiếu nhập có chứa sản phẩm này.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {history.length} dòng nhập
        </Badge>
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có lịch sử nhập hàng cho sản phẩm này.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã phiếu</TableHead>
                <TableHead>Ngày nhập</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead>Kho nhập</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead className="text-right">Giá nhập</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
                <TableHead className="text-right">Đã thanh toán</TableHead>
                <TableHead className="text-right">Loại Nhập</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(({ order, line }, index) => {
                const quantity = Number(line.soLuong ?? line.quantity ?? 0);
                const unitPrice = Number(
                  line.giaNhap ?? line.donGiaNhap ?? line.unitPrice ?? 0
                );
                const lineTotal = Number(
                  line.thanhTien ?? quantity * unitPrice
                );
                const loainhap =
                  line?.loaiNhap === true ? "Nhập kho" : "Nhập cửa hàng";
                return (
                  <TableRow
                    key={`${order.maPhieuNhap ?? "pn"}-${getLineProductId(line) ?? product.id}-${index}`}
                  >
                    <TableCell className="font-medium">
                      PN{String(order.maPhieuNhap ?? "").padStart(4, "0")}
                    </TableCell>
                    <TableCell>
                      {order.ngayNhap
                        ? new Date(order.ngayNhap).toLocaleDateString("vi-VN")
                        : "--"}
                    </TableCell>
                    <TableCell>
                      {order.tenNcc ??
                        suppliers.find((s) => s.maNcc === order.maNcc)?.tenNcc ??
                        "--"}
                    </TableCell>
                    <TableCell>{order.tenKho ?? "--"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {quantity.toLocaleString("vi-VN")} {product.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatPrice(lineTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(order.daThanhToanNcc ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {String(loainhap ?? "")}
                    </TableCell>
                    <TableCell>
                      {formatPurchaseStatus(order.trangThai)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function ProductForm({
  product,
  danhMucs = [],
  setDanhMucs,
  suppliers = [],
  onSave,
  onCancel,
  onDelete,
  saving = false,
  className = "",
  compact = false,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingShortcut, setIsCreatingShortcut] = useState(false);

  /** useLayoutEffect: đồng bộ form trước khi paint — tránh Radix Select kẹt uncontrolled→controlled khi đổi sản phẩm */
  useLayoutEffect(() => {
    if (product) {
      let vatStr = vatToSelectString(
        product.thue ?? product.vat ?? "0"
      );
      vatStr = reconcileVatSelectFromPrices(
        vatStr,
        product.priceBeforeTax ?? product.giaBanLe,
        product.price ?? product.giaSauThue
      );
      const maDanhMuc = resolveCategorySelectValue(product, danhMucs);
      const maNccMacDinh = resolveSupplierSelectValue(product, suppliers);
      setForm({
        name: product.name ?? "",
        sku: product.sku ?? "",
        maDanhMuc,
        maThuongHieu: String(product.maThuongHieu ?? ""),
        price: "",
        priceBeforeTax: String(product.priceBeforeTax ?? ""),
        vat: vatStr,
        cost: String(product.cost ?? ""),
        stock: String(product.stock ?? "0"),
        tonKhoHienTai: String(
          product.tonKhoHienTai ?? product.stock ?? "0"
        ),
        stockAdd: "0",
        tonKhoHienTaiAdd: "0",
        tonKhoToiThieu: String(product.tonKhoToiThieu ?? "0"),
        tonKhoToiDa: String(product.tonKhoToiDa ?? "999999999"),
        unit: trimUnit(product.unit ?? product.donViChinh) || DEFAULT_UNIT,
        maNccMacDinh,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [product, danhMucs, suppliers]);

  const priceAfterTax = useMemo(() => {
    const pbt = Number(form.priceBeforeTax) || 0;
    const vat = Number(form.vat) || 0;
    return Math.round(pbt * (1 + vat / 100));
  }, [form.priceBeforeTax, form.vat]);

  const unitSelectOptions = useMemo(() => {
    const cur = trimUnit(form.unit);
    if (cur && !UNITS.includes(cur)) return [...UNITS, cur];
    return UNITS;
  }, [form.unit]);

  const unitSelectValue = useMemo(() => {
    const cur = trimUnit(form.unit);
    return cur || DEFAULT_UNIT;
  }, [form.unit]);

  const set = (key) => (e) => {
    let value = e.target.value;
    if (["stockAdd", "tonKhoHienTaiAdd"].includes(key) && Number(value) < 0)
      value = "0";
    if (key === "tonKhoToiThieu" && Number(value) < 0) value = "0";
    if (key === "tonKhoToiDa" && Number(value) > 999999999)
      value = "999999999";
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsCreatingShortcut(true);
      const res = await CategoryService.create({
        tenDanhMuc: newCategoryName.trim(),
      });
      if (res.data) {
        setDanhMucs((prev) => [...prev, res.data]);
        setForm((prev) => ({
          ...prev,
          maDanhMuc: String(res.data.maDanhMuc),
        }));
        setNewCategoryName("");
        setShowAddCategory(false);
      }
    } catch {
      alert("Lỗi tạo danh mục");
    } finally {
      setIsCreatingShortcut(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isEdit = Boolean(product);

    const stockCurrent = Number(product?.stock ?? form.stock ?? 0) || 0;
    const stockAdd = Number(form.stockAdd ?? 0) || 0;
    const stockFinal = isEdit
      ? stockCurrent + stockAdd
      : Number(form.stock) || 0;

    const tonKhoCurrent =
      Number(
        product?.tonKhoHienTai ?? product?.stock ?? form.tonKhoHienTai ?? 0
      ) || 0;
    const tonKhoAdd = Number(form.tonKhoHienTaiAdd ?? 0) || 0;
    const tonKhoFinal = isEdit
      ? tonKhoCurrent + tonKhoAdd
      : Number(form.tonKhoHienTai) || 0;

    const unitStr = trimUnit(form.unit) || DEFAULT_UNIT;

    onSave({
      ...form,
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: priceAfterTax,
      priceBeforeTax: Number(form.priceBeforeTax) || 0,
      vat: Number(form.vat) || 0,
      cost: Number(form.cost) || 0,
      stock: stockFinal,
      tonKhoHienTai: tonKhoFinal,
      stockAdd,
      tonKhoHienTaiAdd: tonKhoAdd,
      tonKhoToiThieu: Number(form.tonKhoToiThieu) || 0,
      tonKhoToiDa: Number(form.tonKhoToiDa) || 999999999,
      maDanhMuc: form.maDanhMuc ? Number(form.maDanhMuc) : null,
      maThuongHieu: form.maThuongHieu ? Number(form.maThuongHieu) : null,
      maNccMacDinh: form.maNccMacDinh ? Number(form.maNccMacDinh) : null,
      unit: unitStr,
      donViChinh: unitStr,
      giaNhapGanNhat: Number(form.cost) || 0,
      giaBanLe: Number(form.priceBeforeTax) || 0,
      thue: Number(form.vat) || 0,
      giaSauThue: priceAfterTax,
      ngayTao: product?.ngayTao ?? new Date().toISOString(),
    });
  };

  const displayedStock = product
    ? String(Number(form.stock) + (Number(form.stockAdd) || 0))
    : form.stock;
  const displayedTonKhoHienTai = product
    ? String(
        Number(form.tonKhoHienTai) + (Number(form.tonKhoHienTaiAdd) || 0)
      )
    : form.tonKhoHienTai;

  const vatSelectValue = VAT_SELECT_VALUES.has(form.vat) ? form.vat : "0";

  const categoryKnown = danhMucs.some(
    (d) => String(d.maDanhMuc) === form.maDanhMuc
  );
  const supplierKnown = suppliers.some(
    (s) => String(s.maNcc) === form.maNccMacDinh
  );
  const selectInstanceKey = product?.id ?? "new";

  return (
    <div className={cn("bg-background", className)}>
      <form onSubmit={handleSubmit} className={cn(compact ? "p-0" : "p-6")}>
        <Accordion
          type="multiple"
          defaultValue={["item-1", "item-2", "item-3"]}
          className="mb-6"
        >
          <AccordionItem value="item-1" className="border-none mb-4">
            <AccordionTrigger className="hover:no-underline bg-muted/50 px-4 py-2 rounded-t-lg border-b">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">
                  Thông tin cơ bản
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card border border-t-0 rounded-b-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-sm font-medium">Tên hàng hóa *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setForm((prev) => {
                        // Auto-generate SKU if creating new product
                        if (!product && newName.trim()) {
                          const generatedSku = generateSkuFromName(newName);
                          return {
                            ...prev,
                            name: newName,
                            sku: generatedSku || prev.sku,
                          };
                        }
                        return { ...prev, name: newName };
                      });
                    }}
                    placeholder="Nhập tên sản phẩm..."
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Nhóm hàng</Label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      + Tạo mới
                    </button>
                  </div>
                  <Select
                    key={`dm-${selectInstanceKey}-${form.maDanhMuc}`}
                    value={form.maDanhMuc ? form.maDanhMuc : undefined}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, maDanhMuc: v }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn nhóm hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {danhMucs.map((d) => (
                        <SelectItem
                          key={d.maDanhMuc}
                          value={String(d.maDanhMuc)}
                        >
                          {d.tenDanhMuc}
                        </SelectItem>
                      ))}
                      {form.maDanhMuc && !categoryKnown && (
                        <SelectItem value={form.maDanhMuc}>
                          {product?.category ?? `Nhóm #${form.maDanhMuc}`}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {!product && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Mã SKU</Label>
                    <Input
                      value={form.sku}
                      onChange={set("sku")}
                      placeholder="Tự động sinh từ tên hàng hóa"
                      className="h-10"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Đơn vị tính</Label>
                  <Select
                    key={`unit-${selectInstanceKey}-${unitSelectValue}`}
                    value={unitSelectValue}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, unit: v }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn đơn vị tính" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitSelectOptions.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-sm font-medium">
                    Nhà cung cấp mặc định
                  </Label>
                  <Select
                    key={`ncc-${selectInstanceKey}-${form.maNccMacDinh}`}
                    value={form.maNccMacDinh ? form.maNccMacDinh : undefined}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, maNccMacDinh: v }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem
                          key={s.maNcc}
                          value={String(s.maNcc)}
                        >
                          {s.tenNcc}
                        </SelectItem>
                      ))}
                      {form.maNccMacDinh && !supplierKnown && (
                        <SelectItem value={form.maNccMacDinh}>
                          {product?.supplierName ??
                            `NCC #${form.maNccMacDinh}`}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-none mb-4">
            <AccordionTrigger className="hover:no-underline bg-muted/50 px-4 py-2 rounded-t-lg border-b">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">
                  Giá vốn & Giá bán
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card border border-t-0 rounded-b-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Giá vốn (đ)</Label>
                  <Input
                    type="number"
                    value={form.cost}
                    onChange={set("cost")}
                    className="h-10 border-blue-100 bg-blue-50/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Giá bán trước thuế
                  </Label>
                  <Input
                    type="number"
                    value={form.priceBeforeTax}
                    onChange={set("priceBeforeTax")}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">VAT (%)</Label>
                  <Select
                    key={`vat-${selectInstanceKey}-${vatSelectValue}`}
                    value={vatSelectValue}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, vat: v }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn VAT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="8">8%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-primary">
                    Giá bán sau thuế
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={priceAfterTax}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      className="h-10 text-xl font-bold bg-muted/60 border-muted text-primary cursor-default focus-visible:ring-0"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-bold pointer-events-none">
                      đ
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-none mb-4">
            <AccordionTrigger className="hover:no-underline bg-muted/50 px-4 py-2 rounded-t-lg border-b">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">
                  Tồn kho & Định mức
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card border border-t-0 rounded-b-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {product ? "Số lượng hiện tại" : "Số lượng"}
                  </Label>
                  <Input
                    type="number"
                    value={displayedStock}
                    onChange={set("stock")}
                    className={cn(
                      "h-10",
                      product && "bg-gray-100 text-gray-600 cursor-not-allowed"
                    )}
                    readOnly={!!product}
                    disabled={!!product}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {product ? "Tồn kho hiện tại" : "Tồn kho"}
                  </Label>
                  <Input
                    type="number"
                    value={displayedTonKhoHienTai}
                    onChange={set("tonKhoHienTai")}
                    className={cn(
                      "h-10",
                      product && "bg-gray-100 text-gray-600 cursor-not-allowed"
                    )}
                    readOnly={!!product}
                    disabled={!!product}
                  />
                </div>
                {product && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Số lượng cần thêm
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.stockAdd}
                      onChange={set("stockAdd")}
                      className="h-10"
                    />
                  </div>
                )}
                {product && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Tồn kho cần thêm
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.tonKhoHienTaiAdd}
                      onChange={set("tonKhoHienTaiAdd")}
                      className="h-10"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tồn thấp nhất</Label>
                  <Input
                    type="number"
                    value={form.tonKhoToiThieu}
                    onChange={set("tonKhoToiThieu")}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tồn cao nhất</Label>
                  <Input
                    type="number"
                    value={form.tonKhoToiDa}
                    onChange={set("tonKhoToiDa")}
                    className="h-10"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-between items-center pt-4 border-t sticky bottom-0 bg-background">
          <div>
            {product && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(product)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Xóa sản phẩm
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              {product ? "Lưu thay đổi" : "Lưu sản phẩm"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Thêm nhóm hàng mới</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="VD: Vật liệu xây dựng"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={isCreatingShortcut}
            >
              {isCreatingShortcut && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Tạo mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  danhMucs = [],
  setDanhMucs,
  suppliers = [],
  onSave,
  onDelete,
  saving = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl rounded-xl"
        style={{ maxWidth: "1024px", width: "95vw" }}
      >
        <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/80">
                Điền thông tin bên dưới để khởi tạo hàng hóa mới.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ProductForm
          product={product}
          danhMucs={danhMucs}
          setDanhMucs={setDanhMucs}
          suppliers={suppliers}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
          onDelete={onDelete}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ProductTable() {
  const [products, setProducts] = useState([]);
  const [danhMucs, setDanhMucs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState(["Tất cả"]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const [spRes, dmRes, supplierRes, purchaseOrderRes] =
        await Promise.all([
          ProductService.getAll(),
          CategoryService.getAll(),
          SupplierService.getAll(),
          PurchaseOrderService.getAll(),
        ]);

      const dmList = dmRes?.data ?? [];
      const dmMap = {};
      for (const d of dmList) {
        dmMap[d.maDanhMuc] = d.tenDanhMuc;
        dmMap[String(d.maDanhMuc)] = d.tenDanhMuc;
      }
      const supplierList = supplierRes?.data ?? [];
      const supplierMap = {};
      for (const s of supplierList) {
        supplierMap[s.maNcc] = s.tenNcc;
        supplierMap[String(s.maNcc)] = s.tenNcc;
      }

      setDanhMucs(dmList);
      setSuppliers(supplierList);
      setPurchaseOrders(purchaseOrderRes?.data ?? []);
      setCategories(["Tất cả", ...dmList.map((d) => d.tenDanhMuc)]);
      setProducts(
        (spRes?.data ?? []).map((p) =>
          mapProduct(p, dmMap, supplierMap, dmList, supplierList)
        )
      );
    } catch (err) {
      setFetchError(
        err.message?.includes("Failed to fetch") ||
          err.message?.includes("connect")
          ? "Không thể kết nối server. Kiểm tra API đang chạy chưa."
          : `Lỗi: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      String(p.sku ?? "").toLowerCase().includes(q);
    const matchCat =
      selectedCategory === "Tất cả" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    pageSize,
    setPageSize,
    totalItems,
  } = usePagination(filteredProducts, 10);

  const formatPrice = (v) => new Intl.NumberFormat("vi-VN").format(v) + "đ";
  const formatPurchaseStatus = (status) => {
    if (status === "da_nhap_kho") return "Hoàn thành";
    if (status === "cho_nhap") return "Chưa hoàn thành";
    return status || "--";
  };

  const handleAddProduct = () => {
    setModalOpen(true);
  };

  const handleToggleRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleSaveProduct = async (formData, isEdit = false) => {
    try {
      setSaving(true);

      const payload = {
        maSku: formData.sku || null,
        tenSanPham: formData.name,
        maDanhMuc: (() => {
          const n = Number(formData.maDanhMuc);
          return Number.isFinite(n) &&
            String(formData.maDanhMuc).trim() !== ""
            ? n
            : null;
        })(),
        maNccMacDinh: (() => {
          const n = Number(formData.maNccMacDinh);
          return Number.isFinite(n) &&
            String(formData.maNccMacDinh).trim() !== ""
            ? n
            : null;
        })(),
        donViChinh: (() => {
          const u = formData.unit ?? formData.donViChinh;
          if (u === null || u === undefined) return "Cái";
          const s = String(u).trim();
          return s || "Cái";
        })(),
        giaNhapGanNhat: Number(formData.cost) || 0,
        giaBanLe: Number(formData.priceBeforeTax) || 0,
        thue: Number(formData.vat) || 0,
        giaSauThue: Number(formData.price) || 0,
        soLuong: Number(formData.stock) || 0,
        tonKhoHienTai: Number(formData.tonKhoHienTai) || 0,
        tonKhoToiThieu: Number(formData.tonKhoToiThieu) || 0,
        tonKhoToiDa: Number(formData.tonKhoToiDa) || 0,
        ngayTao: formData.ngayTao ?? new Date().toISOString(),
      };

      if (isEdit) {
        const soLuongNhap = Number(formData.stockAdd) || 0;
        const tonKhoNhap = Number(formData.tonKhoHienTaiAdd) || 0;
        const shouldImportMore = soLuongNhap > 0 || tonKhoNhap > 0;

        if (shouldImportMore) {
          if (!formData.maNccMacDinh)
            throw new Error(
              "Vui lòng chọn nhà cung cấp mặc định để nhập thêm hàng."
            );

          await PurchaseOrderService.nhapThemHang({
            maNhaCungCap: Number(formData.maNccMacDinh),
            maSanPham: Number(formData.id),
            sanPham: {
              maSanPham: Number(formData.id),
              ...payload,
            },
            soLuongNhap,
            tonKhoNhap,
            donGiaNhap: Number(formData.cost) || 0,
            maKho: 1,
            maNguoiDung: 1,
            soTienThanhToanNgay: 0,
          });
        } else {
          await ProductService.update(formData.id, payload);
        }
        setExpandedRowId(null);
      } else {
        await ProductService.create(payload);
        setModalOpen(false);
      }
      await loadData();
    } catch (err) {
      alert(`Lưu thất bại: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await ProductService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      alert(`Xóa thất bại: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm sản phẩm hoặc SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            disabled={loading}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            disabled={loading}
            title="Tải lại"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={handleAddProduct} className="gap-2" disabled={loading}>
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {fetchError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className="text-sm"
            disabled={loading}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Sản phẩm</TableHead>
              <TableHead>Mã SKU</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Giá nhập</TableHead>
              <TableHead className="text-right">Giá bán</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead className="text-right">Tồn kho hiện tại</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8" />
                    <p>Không tìm thấy sản phẩm</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((product) => {
                const status = statusConfig[product.status];
                const isExpanded = expandedRowId === product.id;
                return (
                  <Fragment key={product.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-colors",
                        isExpanded ? "bg-muted/30" : "hover:bg-muted/50"
                      )}
                      onClick={() => handleToggleRow(product.id)}
                    >
                      <TableCell className="font-semibold text-primary">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {product.sku}
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPrice(product.cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(product.price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.stock.toLocaleString("vi-VN")} {product.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.tonKhoHienTai.toLocaleString("vi-VN")}{" "}
                        {product.unit}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", status.className)}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20 border-b-2 border-primary/20">
                        <TableCell colSpan={8} className="p-0">
                          <div className="animate-in slide-in-from-top-1 duration-200">
                            <Tabs
                              key={product.id}
                              defaultValue="product-info"
                              className="border-x shadow-inner"
                            >
                              <div className="border-b bg-background px-4 pt-4">
                                <TabsList className="grid h-auto w-full grid-cols-2 sm:w-fit">
                                  <TabsTrigger
                                    value="product-info"
                                    className="gap-2 px-4 py-2"
                                  >
                                    <Info className="h-4 w-4" />
                                    Thông tin sản phẩm
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="purchase-history"
                                    className="gap-2 px-4 py-2"
                                  >
                                    <History className="h-4 w-4" />
                                    Lịch sử nhập hàng
                                  </TabsTrigger>
                                </TabsList>
                              </div>

                              <TabsContent value="product-info" className="mt-0">
                                <div className="space-y-4 p-4">
                                  <ProductForm
                                    key={product.id}
                                    product={product}
                                    danhMucs={danhMucs}
                                    setDanhMucs={setDanhMucs}
                                    suppliers={suppliers}
                                    onSave={(data) =>
                                      handleSaveProduct(
                                        { ...data, id: product.id },
                                        true
                                      )
                                    }
                                    onCancel={() => setExpandedRowId(null)}
                                    onDelete={(p) => setDeleteTarget(p)}
                                    saving={saving}
                                    compact
                                  />
                                </div>
                              </TabsContent>

                              <TabsContent
                                value="purchase-history"
                                className="mt-0 p-4"
                              >
                                <ProductPurchaseHistoryTab
                                  product={product}
                                  suppliers={suppliers}
                                  purchaseOrders={purchaseOrders}
                                  formatPrice={formatPrice}
                                  formatPurchaseStatus={formatPurchaseStatus}
                                />
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        {!loading && !fetchError && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Hiển thị</span>
            <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
            <span>/ {totalItems} sản phẩm</span>
          </p>
        )}
        <PaginationWrapper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={null}
        danhMucs={danhMucs}
        setDanhMucs={setDanhMucs}
        suppliers={suppliers}
        onSave={(data) => handleSaveProduct(data, false)}
        saving={saving}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>? Hành
              động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}{" "}
              Xóa sản phẩm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
