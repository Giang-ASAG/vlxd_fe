"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  Fragment,
  useRef,
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
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronDown,
  ChevronUp,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
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
import { getSession } from "@/src/auth/session";
import * as XLSX from 'xlsx';

// ─── Toast Notification Component ────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-600" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    info: <AlertCircle className="h-5 w-5 text-blue-600" />,
  };

  const colors = {
    success: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
    error: "border-destructive/30 bg-destructive/5",
    warning: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
    info: "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
  };

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-top-2 max-w-md",
      colors[type]
    )}>
      {icons[type]}
      <p className="text-sm font-medium whitespace-pre-line">{message}</p>
      <button onClick={onClose} className="ml-4 rounded p-1 hover:bg-muted shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Form / Select ──────────────────────────────────────────────────────────

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

function generateSkuFromName(name) {
  if (!name || typeof name !== "string") return "";
  const words = name.trim().split(/\s+/);
  const initials = words
    .map((w) => w.charAt(0).toUpperCase())
    .filter((c) => c.match(/[A-Z0-9]/))
    .join("");
  
  if (!initials) return "";
  
  const randomDigits = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  return `${initials}-${randomDigits}`;
}

const VAT_SELECT_VALUES = new Set(["0", "5", "8", "10"]);

function vatToSelectString(v) {
  const n = Math.round(Number(String(v).replace(",", ".").replace(/%/g, "").trim()) || 0);
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
  if (!product || !Array.isArray(danhMucs) || danhMucs.length === 0) return "";
  const idSet = new Set(danhMucs.map((d) => String(d.maDanhMuc)));
  const raw = product.maDanhMuc ?? product.MaDanhMuc ?? product.maDanhMucId;
  if (raw != null && raw !== "" && idSet.has(String(raw))) return String(raw);
  const label = product.category ?? product.tenDanhMuc ?? product.TenDanhMuc ?? product.tenNhomHang;
  if (label) {
    const hit = danhMucs.find((d) => d.tenDanhMuc === label);
    if (hit) return String(hit.maDanhMuc);
  }
  return raw != null && raw !== "" ? String(raw) : "";
}

function resolveSupplierSelectValue(product, suppliers) {
  if (!product || !Array.isArray(suppliers) || suppliers.length === 0) return "";
  const idSet = new Set(suppliers.map((s) => String(s.maNcc)));
  const raw = product.maNccMacDinh ?? product.maNcc ?? product.MaNccMacDinh ?? product.MaNcc;
  if (raw != null && raw !== "" && idSet.has(String(raw))) return String(raw);
  const label = product.supplierName ?? product.tenNcc ?? product.TenNcc ?? product.tenNhaCungCap ?? product.TenNhaCungCap;
  if (label && label !== "Chưa có nhà cung cấp") {
    const hit = suppliers.find((s) => s.tenNcc === label);
    if (hit) return String(hit.maNcc);
  }
  return raw != null && raw !== "" ? String(raw) : "";
}

// ─── Import Dialog Component ─────────────────────────────────────────────────

function ProductImportDialog({ isOpen, onClose, onImport, isImporting, categories, suppliers }) {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [supplierMap, setSupplierMap] = useState({});
  const [unitMap, setUnitMap] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    const catMap = {};
    categories.forEach(cat => {
      catMap[cat.tenDanhMuc?.toLowerCase().trim()] = cat.maDanhMuc;
      catMap[cat.tenDanhMuc] = cat.maDanhMuc;
    });
    setCategoryMap(catMap);

    const supMap = {};
    suppliers.forEach(sup => {
      supMap[sup.tenNcc?.toLowerCase().trim()] = sup.maNcc;
      supMap[sup.tenNcc] = sup.maNcc;
    });
    setSupplierMap(supMap);

    const unitMapObj = {};
    UNITS.forEach(unit => {
      unitMapObj[unit.toLowerCase().trim()] = unit;
      unitMapObj[unit] = unit;
    });
    setUnitMap(unitMapObj);
  }, [categories, suppliers]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const productSheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('sản phẩm') || 
          name.toLowerCase().includes('product') ||
          name.toLowerCase().includes('hang hoa')
        ) || workbook.SheetNames[0];
        
        const productSheet = workbook.Sheets[productSheetName];
        const jsonData = XLSX.utils.sheet_to_json(productSheet);

        const mappedData = [];
        const validationErrors = [];

        jsonData.forEach((row, index) => {
          const tenSanPham = row["Tên sản phẩm"] || row["TenSanPham"] || row["tenSanPham"] || "";
          const maSku = row["Mã SKU"] || row["MaSKU"] || row["sku"] || "";
          const nhomHang = row["Nhóm hàng"] || row["NhomHang"] || row["danhMuc"] || "";
          const donViTinh = row["Đơn vị tính"] || row["DonViTinh"] || row["unit"] || "";
          const nhaCungCap = row["Nhà cung cấp"] || row["NhaCungCap"] || row["supplier"] || "";
          const giaNhap = row["Giá nhập"] || row["GiaNhap"] || row["cost"] || 0;
          const giaBanLe = row["Giá bán lẻ"] || row["GiaBanLe"] || row["priceBeforeTax"] || 0;
          const vat = row["VAT"] || row["vat"] || row["thue"] || 0;
          const soLuong = row["Số lượng"] || row["SoLuong"] || row["stock"] || 0;
          const tonKho = row["Tồn kho"] || row["TonKho"] || row["inventory"] || 0;
          const tonToiThieu = row["Tồn tối thiểu"] || row["TonToiThieu"] || row["minStock"] || 0;
          const tonToiDa = row["Tồn tối đa"] || row["TonToiDa"] || row["maxStock"] || 999999999;

          if (!tenSanPham) {
            validationErrors.push(`Dòng ${index + 2}: Thiếu tên sản phẩm`);
            return;
          }

          let maDanhMuc = null;
          if (nhomHang) {
            const categoryId = categoryMap[nhomHang.toLowerCase().trim()] || categoryMap[nhomHang];
            if (categoryId) {
              maDanhMuc = categoryId;
            } else {
              validationErrors.push(`Dòng ${index + 2}: Nhóm hàng "${nhomHang}" không tồn tại trong hệ thống`);
            }
          }

          let maNccMacDinh = null;
          if (nhaCungCap) {
            const supplierId = supplierMap[nhaCungCap.toLowerCase().trim()] || supplierMap[nhaCungCap];
            if (supplierId) {
              maNccMacDinh = supplierId;
            } else {
              validationErrors.push(`Dòng ${index + 2}: Nhà cung cấp "${nhaCungCap}" không tồn tại trong hệ thống`);
            }
          }

          let unit = DEFAULT_UNIT;
          if (donViTinh) {
            const mappedUnit = unitMap[donViTinh.toLowerCase().trim()] || unitMap[donViTinh];
            if (mappedUnit) {
              unit = mappedUnit;
            } else {
              validationErrors.push(`Dòng ${index + 2}: Đơn vị tính "${donViTinh}" không hợp lệ, sẽ dùng mặc định "${DEFAULT_UNIT}"`);
            }
          }

          mappedData.push({
            tenSanPham: String(tenSanPham).trim(),
            maSku: maSku ? String(maSku).trim() : generateSkuFromName(tenSanPham),
            maDanhMuc,
            maNccMacDinh,
            donViChinh: unit,
            giaNhapGanNhat: Number(giaNhap) || 0,
            giaBanLe: Number(giaBanLe) || 0,
            thue: Number(vat) || 0,
            soLuong: Number(soLuong) || 0,
            tonKhoHienTai: Number(tonKho) || 0,
            tonKhoToiThieu: Number(tonToiThieu) || 0,
            tonKhoToiDa: Number(tonToiDa) || 999999999,
          });
        });

        if (validationErrors.length > 0) {
          setErrors(validationErrors);
        } else {
          setPreviewData(mappedData);
        }
      } catch (err) {
        setErrors(["Không thể đọc file Excel. Vui lòng kiểm tra định dạng file."]);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) {
      setErrors(["Vui lòng chọn file Excel hợp lệ"]);
      return;
    }

    await onImport(previewData);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "Tên sản phẩm": "Gạch ốp lát 30x30",
        "Mã SKU": "GACH-001",
        "Nhóm hàng": "Vật liệu xây dựng",
        "Đơn vị tính": "Viên",
        "Nhà cung cấp": "Công ty TNHH ABC",
        "Giá nhập": 5000,
        "Giá bán lẻ": 8000,
        "VAT": 10,
        "Số lượng": 1000,
        "Tồn kho": 500,
        "Tồn tối thiểu": 100,
        "Tồn tối đa": 5000
      },
      {
        "Tên sản phẩm": "Xi măng PCB40",
        "Mã SKU": "XM-002",
        "Nhóm hàng": "Vật liệu xây dựng",
        "Đơn vị tính": "Bao",
        "Nhà cung cấp": "Công ty Cổ phần DEF",
        "Giá nhập": 70000,
        "Giá bán lẻ": 85000,
        "VAT": 8,
        "Số lượng": 200,
        "Tồn kho": 150,
        "Tồn tối thiểu": 50,
        "Tồn tối đa": 1000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SanPham");
    
    const categorySheet = XLSX.utils.json_to_sheet(
      categories.map(c => ({ "Mã nhóm": c.maDanhMuc, "Tên nhóm hàng": c.tenDanhMuc }))
    );
    XLSX.utils.book_append_sheet(wb, categorySheet, "NhomHang");
    
    const unitSheet = XLSX.utils.json_to_sheet(
      UNITS.map(u => ({ "Đơn vị tính": u }))
    );
    XLSX.utils.book_append_sheet(wb, unitSheet, "DonViTinh");
    
    const supplierSheet = XLSX.utils.json_to_sheet(
      suppliers.map(s => ({ "Mã NCC": s.maNcc, "Tên nhà cung cấp": s.tenNcc }))
    );
    XLSX.utils.book_append_sheet(wb, supplierSheet, "NhaCungCap");
    
    XLSX.writeFile(wb, `mau_nhap_san_pham_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="border-b bg-primary/5 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Import sản phẩm từ Excel</h3>
                <p className="text-sm text-muted-foreground">
                  Tải file mẫu và nhập dữ liệu theo đúng định dạng
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Tải file mẫu Excel</p>
                  <p className="text-xs text-muted-foreground">
                    File bao gồm các sheet: Sản phẩm, Nhóm hàng, Đơn vị tính, Nhà cung cấp
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Tải mẫu
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Chọn file Excel</Label>
            <div className="flex items-center gap-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                    setErrors([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Lỗi validation:</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-destructive/80">
                    {errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {errors.length > 5 && (
                      <li>... và {errors.length - 5} lỗi khác</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Xem trước dữ liệu ({previewData.length} dòng)
                </p>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Tên sản phẩm</TableHead>
                      <TableHead>Mã SKU</TableHead>
                      <TableHead>Nhóm hàng</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Giá bán</TableHead>
                      <TableHead>Số lượng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((item, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-medium">{item.tenSanPham}</TableCell>
                        <TableCell className="font-mono">{item.maSku}</TableCell>
                        <TableCell>
                          {categories.find(c => c.maDanhMuc === item.maDanhMuc)?.tenDanhMuc || "--"}
                        </TableCell>
                        <TableCell>{item.donViChinh}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("vi-VN").format(item.giaBanLe)}đ
                        </TableCell>
                        <TableCell className="text-right">{item.soLuong}</TableCell>
                      </TableRow>
                    ))}
                    {previewData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          ... và {previewData.length - 10} dòng khác
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isImporting} className="px-5">
            Hủy
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || previewData.length === 0 || isImporting || errors.length > 0}
            className="gap-2 px-5"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import dữ liệu
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Bảng / API mapping ─────────────────────────────────────────────────────

const statusConfig = {
  active: { label: "Còn hàng", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  low_stock: { label: "Sắp hết", className: "bg-amber-100 text-amber-700 border-amber-200" },
  out_of_stock: { label: "Hết hàng", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function inferVatFromPrices(pre, post) {
  if (!Number.isFinite(pre) || pre <= 0 || !Number.isFinite(post) || post < pre) return 0;
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
    if (n === 0 && Number.isFinite(pre) && pre > 0 && Number.isFinite(post) && post > pre) {
      const zeroVatMatch = Math.abs(Math.round(pre) - post) <= 2;
      if (!zeroVatMatch) return inferVatFromPrices(pre, post);
    }
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return inferVatFromPrices(pre, post);
}

function mapProduct(p, danhMucMap, supplierMap, dmList = [], supplierList = []) {
  const stock = p.soLuong ?? 0;
  const currentInventory = p.tonKhoHienTai ?? 0;
  const totalStock = stock + currentInventory;
  
  let status = "active";
  if (totalStock <= 0) status = "out_of_stock";
  else if (totalStock <= 100) status = "low_stock";

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

  let maNccMacDinh = p.maNccMacDinh ?? p.maNcc ?? p.MaNccMacDinh ?? p.MaNcc;
  if ((maNccMacDinh == null || maNccMacDinh === "") && supplierList.length) {
    const ten = p.tenNcc ?? p.TenNcc ?? p.tenNhaCungCap ?? p.TenNhaCungCap;
    if (ten) {
      const hit = supplierList.find((s) => s.tenNcc === ten);
      if (hit) maNccMacDinh = hit.maNcc;
    }
  }

  const category = danhMucMap[maDanhMuc] ?? danhMucMap[String(maDanhMuc)] ?? "Khác";
  const supplierName = supplierMap[maNccMacDinh] ?? supplierMap[String(maNccMacDinh)] ?? "Chưa có nhà cung cấp";

  return {
    id: p.maSanPham,
    name: p.tenSanPham,
    sku: p.maSku,
    maDanhMuc: toSelectIdString(maDanhMuc),
    maThuongHieu: p.maThuongHieu ?? p.MaThuongHieu ?? "",
    category,
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
    maNccMacDinh: toSelectIdString(maNccMacDinh),
    supplierName,
    ngayTao: p.ngayTao,
    status,
  };
}

function getPurchaseOrderLines(order) {
  const possibleKeys = ["sanPhamDtos", "chiTiet", "chiTietPhieuNhap", "chiTietPhieuNhaps", "danhSachChiTiet", "details", "items", "sanPhams"];
  for (const key of possibleKeys) {
    if (Array.isArray(order?.[key])) return order[key];
  }
  return [];
}

function getLineProductId(line) {
  return line?.maSanPham ?? line?.sanPhamId ?? line?.maHangHoa ?? line?.productId;
}

function getProductPurchaseHistory(purchaseOrders, productId) {
  if (!productId) return [];
  return purchaseOrders.flatMap((order) => {
    const matchingLines = getPurchaseOrderLines(order).filter((line) => Number(getLineProductId(line)) === Number(productId));
    if (matchingLines.length === 0 && Number(order?.maSanPham) === Number(productId)) {
      return [{ order, line: order }];
    }
    return matchingLines.map((line) => ({ order, line }));
  });
}

function ProductPurchaseHistoryTab({ product, suppliers, purchaseOrders, formatPrice, formatPurchaseStatus }) {
  const history = getProductPurchaseHistory(purchaseOrders, product.id);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Lịch sử nhập của {product.name}</h3>
          <p className="text-sm text-muted-foreground">Theo dõi các phiếu nhập có chứa sản phẩm này.</p>
        </div>
        <Badge variant="secondary" className="text-xs">{history.length} dòng nhập</Badge>
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có lịch sử nhập hàng cho sản phẩm này.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Mã phiếu</TableHead>
                <TableHead>Ngày nhập</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
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
                const unitPrice = Number(line.giaNhap ?? line.donGiaNhap ?? line.unitPrice ?? 0);
                const lineTotal = Number(line.thanhTien ?? quantity * unitPrice);
                const loainhap = line?.loaiNhap === true ? `Nhập ${order?.tenKho ?? ""}` : "Nhập cửa hàng";
                return (
                  <TableRow key={`${order.maPhieuNhap ?? "pn"}-${getLineProductId(line) ?? product.id}-${index}`} className="text-sm hover:bg-muted/30">
                    <TableCell className="font-medium">PN{String(order.maPhieuNhap ?? "").padStart(4, "0")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.ngayNhap ? new Date(order.ngayNhap).toLocaleDateString("vi-VN") : "--"}
                    </TableCell>
                    <TableCell>{order.tenNcc ?? suppliers.find((s) => s.maNcc === order.maNcc)?.tenNcc ?? "--"}</TableCell>
                    <TableCell className="text-right tabular-nums">{quantity.toLocaleString("vi-VN")} {product.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(unitPrice)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPrice(lineTotal)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatPrice(order.daThanhToanNcc ?? 0)}</TableCell>
                    <TableCell className="text-right">{loainhap}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {formatPurchaseStatus(order.trangThai)}
                      </span>
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

// ─── ProductForm Component ─────────────────────────────────────────────────

export function ProductForm({ product, danhMucs = [], setDanhMucs, suppliers = [], onSave, onCancel, onDelete, saving = false, className = "", compact = false }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingShortcut, setIsCreatingShortcut] = useState(false);

  useLayoutEffect(() => {
    if (product) {
      let vatStr = vatToSelectString(product.thue ?? product.vat ?? "0");
      vatStr = reconcileVatSelectFromPrices(vatStr, product.priceBeforeTax ?? product.giaBanLe, product.price ?? product.giaSauThue);
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
        tonKhoHienTai: String(product.tonKhoHienTai ?? product.stock ?? "0"),
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
    if (["stockAdd", "tonKhoHienTaiAdd"].includes(key) && Number(value) < 0) value = "0";
    if (key === "tonKhoToiThieu" && Number(value) < 0) value = "0";
    if (key === "tonKhoToiDa" && Number(value) > 999999999) value = "999999999";
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsCreatingShortcut(true);
      const res = await CategoryService.create({ tenDanhMuc: newCategoryName.trim() });
      if (res.data) {
        setDanhMucs((prev) => [...prev, res.data]);
        setForm((prev) => ({ ...prev, maDanhMuc: String(res.data.maDanhMuc) }));
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
    const stockAdd = Number(form.stockAdd ?? 0) || 0;
    const stockFinal = isEdit ? (Number(product?.stock ?? 0) || 0) + stockAdd : Number(form.stock) || 0;
    const tonKhoAdd = Number(form.tonKhoHienTaiAdd ?? 0) || 0;
    const tonKhoFinal = isEdit ? (Number(product?.tonKhoHienTai ?? product?.stock ?? 0) || 0) + tonKhoAdd : Number(form.tonKhoHienTai) || 0;

    onSave({
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
      maNccMacDinh: form.maNccMacDinh ? Number(form.maNccMacDinh) : null,
      unit: trimUnit(form.unit) || DEFAULT_UNIT,
      ngayTao: product?.ngayTao ?? new Date().toISOString(),
    });
  };

  const displayedStock = product ? String(Number(form.stock) + (Number(form.stockAdd) || 0)) : form.stock;
  const displayedTonKhoHienTai = product ? String(Number(form.tonKhoHienTai) + (Number(form.tonKhoHienTaiAdd) || 0)) : form.tonKhoHienTai;
  const vatSelectValue = VAT_SELECT_VALUES.has(form.vat) ? form.vat : "0";
  const categoryKnown = danhMucs.some((d) => String(d.maDanhMuc) === form.maDanhMuc);
  const supplierKnown = suppliers.some((s) => String(s.maNcc) === form.maNccMacDinh);
  const selectInstanceKey = product?.id ?? "new";

  return (
    <div className={cn("bg-background", className)}>
      <form onSubmit={handleSubmit} className={cn(compact ? "p-0" : "p-6")}>
        <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]} className="mb-6 space-y-4">
          <AccordionItem value="item-1" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="hover:no-underline bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Thông tin cơ bản</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-sm font-medium">Tên hàng hóa *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setForm((prev) => {
                        if (!product && newName.trim()) {
                          const generatedSku = generateSkuFromName(newName);
                          return { ...prev, name: newName, sku: generatedSku || prev.sku };
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
                    <button type="button" onClick={() => setShowAddCategory(true)} className="text-xs text-primary hover:underline">
                      + Tạo mới
                    </button>
                  </div>
                  <Select key={`dm-${selectInstanceKey}-${form.maDanhMuc}`} value={form.maDanhMuc ? form.maDanhMuc : undefined} onValueChange={(v) => setForm((p) => ({ ...p, maDanhMuc: v }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn nhóm hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {danhMucs.map((d) => (
                        <SelectItem key={d.maDanhMuc} value={String(d.maDanhMuc)}>{d.tenDanhMuc}</SelectItem>
                      ))}
                      {form.maDanhMuc && !categoryKnown && (
                        <SelectItem value={form.maDanhMuc}>{product?.category ?? `Nhóm #${form.maDanhMuc}`}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {!product && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Mã SKU</Label>
                    <Input value={form.sku} onChange={set("sku")} placeholder="Tự động sinh từ tên hàng hóa" className="h-10" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Đơn vị tính</Label>
                  <Select key={`unit-${selectInstanceKey}-${unitSelectValue}`} value={unitSelectValue} onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn đơn vị tính" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitSelectOptions.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-sm font-medium">Nhà cung cấp mặc định</Label>
                  <Select key={`ncc-${selectInstanceKey}-${form.maNccMacDinh}`} value={form.maNccMacDinh ? form.maNccMacDinh : undefined} onValueChange={(v) => setForm((p) => ({ ...p, maNccMacDinh: v }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.maNcc} value={String(s.maNcc)}>{s.tenNcc}</SelectItem>
                      ))}
                      {form.maNccMacDinh && !supplierKnown && (
                        <SelectItem value={form.maNccMacDinh}>{product?.supplierName ?? `NCC #${form.maNccMacDinh}`}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="hover:no-underline bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Giá vốn & Giá bán</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Giá vốn (đ)</Label>
                  <Input type="number" value={form.cost} onChange={set("cost")} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Giá bán trước thuế</Label>
                  <Input type="number" value={form.priceBeforeTax} onChange={set("priceBeforeTax")} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">VAT (%)</Label>
                  <Select key={`vat-${selectInstanceKey}-${vatSelectValue}`} value={vatSelectValue} onValueChange={(v) => setForm((p) => ({ ...p, vat: v }))}>
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
                  <Label className="text-sm font-medium text-primary">Giá bán sau thuế</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={priceAfterTax}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      className="h-10 text-xl font-bold bg-muted/60 border-muted text-primary cursor-default focus-visible:ring-0"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-bold pointer-events-none">đ</div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="hover:no-underline bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Tồn kho & Định mức</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{product ? "Số lượng hiện tại" : "Số lượng"}</Label>
                  <Input
                    type="number"
                    value={displayedStock}
                    onChange={set("stock")}
                    className={cn("h-10", product && "bg-muted/60 text-muted-foreground cursor-not-allowed")}
                    readOnly={!!product}
                    disabled={!!product}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{product ? "Tồn kho hiện tại" : "Tồn kho"}</Label>
                  <Input
                    type="number"
                    value={displayedTonKhoHienTai}
                    onChange={set("tonKhoHienTai")}
                    className={cn("h-10", product && "bg-muted/60 text-muted-foreground cursor-not-allowed")}
                    readOnly={!!product}
                    disabled={!!product}
                  />
                </div>
                {product && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Số lượng cần thêm</Label>
                    <Input type="number" min="0" value={form.stockAdd} onChange={set("stockAdd")} className="h-10" />
                  </div>
                )}
                {product && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tồn kho cần thêm</Label>
                    <Input type="number" min="0" value={form.tonKhoHienTaiAdd} onChange={set("tonKhoHienTaiAdd")} className="h-10" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tồn thấp nhất</Label>
                  <Input type="number" value={form.tonKhoToiThieu} onChange={set("tonKhoToiThieu")} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tồn cao nhất</Label>
                  <Input type="number" value={form.tonKhoToiDa} onChange={set("tonKhoToiDa")} className="h-10" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-between items-center pt-4 border-t sticky bottom-0 bg-background">
          <div>
            {product && (
              <Button type="button" variant="destructive" onClick={() => onDelete(product)} className="gap-2">
                <Trash2 className="h-4 w-4" /> Xóa sản phẩm
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Hủy bỏ</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
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
            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="VD: Vật liệu xây dựng" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>Hủy</Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingShortcut}>
              {isCreatingShortcut && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Tạo mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ProductModal Component ─────────────────────────────────────────────────

export function ProductModal({ open, onOpenChange, product, danhMucs = [], setDanhMucs, suppliers = [], onSave, onDelete, saving = false }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl rounded-xl" style={{ maxWidth: "1024px", width: "95vw" }}>
        <DialogHeader className="p-6 bg-primary text-primary-foreground rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/80">Điền thông tin bên dưới để khởi tạo hàng hóa mới.</DialogDescription>
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

// ─── ProductTable Component (Main) ──────────────────────────────────────────

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
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  
  // Toast states
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const [spRes, dmRes, supplierRes, purchaseOrderRes] = await Promise.all([
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
      setProducts((spRes?.data ?? []).map((p) => mapProduct(p, dmMap, supplierMap, dmList, supplierList)));
    } catch (err) {
      setFetchError(err.message?.includes("Failed to fetch") || err.message?.includes("connect")
        ? "Không thể kết nối server. Kiểm tra API đang chạy chưa."
        : `Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImportProducts = async (importData) => {
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];
    const duplicates = [];
    const session = getSession();

    try {
      const existingProducts = await ProductService.getAll();
      const existingProductNames = new Set();
      const existingProductSkus = new Set();
      
      if (existingProducts?.data) {
        existingProducts.data.forEach(product => {
          if (product.tenSanPham) {
            existingProductNames.add(product.tenSanPham.toLowerCase().trim());
          }
          if (product.maSku) {
            existingProductSkus.add(product.maSku.toLowerCase().trim());
          }
        });
      }

      for (let i = 0; i < importData.length; i++) {
        const product = importData[i];
        
        const isDuplicateName = existingProductNames.has(product.tenSanPham.toLowerCase().trim());
        const isDuplicateSku = product.maSku && existingProductSkus.has(product.maSku.toLowerCase().trim());
        
        if (isDuplicateName || isDuplicateSku) {
          duplicateCount++;
          duplicates.push({
            name: product.tenSanPham,
            sku: product.maSku,
            reason: isDuplicateName ? "Tên sản phẩm đã tồn tại" : "Mã SKU đã tồn tại"
          });
          continue;
        }
        
        try {
          const payload = {
            maSku: product.maSku || null,
            tenSanPham: product.tenSanPham,
            maNguoiLap: session.user?.sub ? Number(session.user?.sub) : 1,
            maDanhMuc: product.maDanhMuc || null,
            maNccMacDinh: product.maNccMacDinh || null,
            donViChinh: product.donViChinh || DEFAULT_UNIT,
            giaNhapGanNhat: product.giaNhapGanNhat || 0,
            giaBanLe: product.giaBanLe || 0,
            thue: product.thue || 0,
            giaSauThue: Math.round((product.giaBanLe || 0) * (1 + (product.thue || 0) / 100)),
            soLuong: product.soLuong || 0,
            tonKhoHienTai: product.tonKhoHienTai || 0,
            tonKhoToiThieu: product.tonKhoToiThieu || 0,
            tonKhoToiDa: product.tonKhoToiDa || 999999999,
            ngayTao: new Date().toISOString(),
          };

          await ProductService.create(payload);
          successCount++;
          
          existingProductNames.add(product.tenSanPham.toLowerCase().trim());
          if (product.maSku) {
            existingProductSkus.add(product.maSku.toLowerCase().trim());
          }
        } catch (err) {
          errorCount++;
          errors.push(`${product.tenSanPham}: ${err.message}`);
        }
      }

      await loadData();
      
      setImportDialogOpen(false);
      
      let message = `📊 KẾT QUẢ IMPORT\n\n`;
      message += `✅ Thành công: ${successCount} sản phẩm\n`;
      message += `⚠️ Trùng lặp: ${duplicateCount} sản phẩm\n`;
      message += `❌ Thất bại: ${errorCount} sản phẩm\n`;
      message += `📝 Tổng số: ${importData.length} sản phẩm\n`;
      
      if (duplicates.length > 0) {
        message += `\n🔁 Danh sách trùng: ${duplicates.slice(0, 5).map(d => d.name).join(", ")}`;
        if (duplicates.length > 5) message += `... và ${duplicates.length - 5} sản phẩm khác`;
      }
      
      showToast(message, successCount > 0 ? "success" : "warning");
      setImportResult({ successCount, errorCount, duplicateCount, errors, duplicates, total: importData.length });
      
      setTimeout(() => setImportResult(null), 8000);
    } catch (err) {
      showToast(`❌ Lỗi khi import: ${err.message}`, "error");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || String(p.sku ?? "").toLowerCase().includes(q);
    const matchCat = selectedCategory === "Tất cả" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const { currentPage, totalPages, paginatedItems, goToPage, pageSize, setPageSize, totalItems } = usePagination(filteredProducts, 10);

  const formatPrice = (v) => new Intl.NumberFormat("vi-VN").format(v) + "đ";
  const formatPurchaseStatus = (status) => {
    if (status === "da_nhap_kho") return "Hoàn thành";
    if (status === "cho_nhap") return "Chưa hoàn thành";
    return status || "--";
  };

  const handleAddProduct = () => setModalOpen(true);
  const handleToggleRow = (id) => setExpandedRowId(expandedRowId === id ? null : id);

  const handleSaveProduct = async (formData, isEdit = false) => {
    try {
      setSaving(true);
      const session = getSession();
      const payload = {
        maSku: formData.sku || null,
        tenSanPham: formData.name,
        maNguoiLap: session.user?.sub ? Number(session.user?.sub) : 1,
        maDanhMuc: (() => {
          const n = Number(formData.maDanhMuc);
          return Number.isFinite(n) && String(formData.maDanhMuc).trim() !== "" ? n : null;
        })(),
        maNccMacDinh: (() => {
          const n = Number(formData.maNccMacDinh);
          return Number.isFinite(n) && String(formData.maNccMacDinh).trim() !== "" ? n : null;
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
          if (!formData.maNccMacDinh) throw new Error("Vui lòng chọn nhà cung cấp mặc định để nhập thêm hàng.");
          await PurchaseOrderService.nhapThemHang({
            maNhaCungCap: Number(formData.maNccMacDinh),
            maSanPham: Number(formData.id),
            sanPham: { maSanPham: Number(formData.id), ...payload },
            soLuongNhap,
            tonKhoNhap,
            donGiaNhap: Number(formData.cost) || 0,
            maKho: 1,
            maNguoiDung: session.user?.sub ? Number(session.user?.sub) : 1,
            soTienThanhToanNgay: 0,
          });
          showToast(`✅ Nhập thêm hàng cho sản phẩm "${formData.name}" thành công!`, "success");
        } else {
          await ProductService.update(formData.id, payload);
          showToast(`✅ Cập nhật sản phẩm "${formData.name}" thành công!`, "success");
        }
        setExpandedRowId(null);
      } else {
        await ProductService.create(payload);
        setModalOpen(false);
        showToast(`✅ Thêm sản phẩm "${formData.name}" thành công!`, "success");
      }
      await loadData();
    } catch (err) {
      showToast(`❌ Lỗi: ${err.message}`, "error");
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
      showToast(`✅ Xóa sản phẩm "${deleteTarget.name}" thành công!`, "success");
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("ràng buộc") || msg.includes("constraint") || msg.includes("foreign") || msg.includes("related")) {
        showToast(`⚠️ Không thể xóa sản phẩm "${deleteTarget.name}" vì có dữ liệu liên quan trong hệ thống!`, "warning");
      } else { 
        showToast(`❌ Lỗi: ${msg}`, "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => {
    const totalStock = (p.stock || 0) + (p.tonKhoHienTai || 0);
    return totalStock > 0 && totalStock <= 100;
  }).length;
  const outOfStockCount = products.filter(p => {
    const totalStock = (p.stock || 0) + (p.tonKhoHienTai || 0);
    return totalStock <= 0;
  }).length;

  if (loading) return (
    <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span>Đang tải dữ liệu sản phẩm...</span>
    </div>
  );

  if (fetchError) return (
    <div className="flex h-96 flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p className="font-medium">{fetchError}</p>
      </div>
      <Button variant="outline" onClick={loadData}>Thử lại</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sản phẩm</h1>
          <p className="text-sm text-muted-foreground">Quản lý danh sách hàng hóa, tồn kho và giá bán</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={handleAddProduct} className="gap-2" disabled={loading}>
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {importResult && (
        <div className={cn(
          "rounded-lg border p-4",
          importResult.successCount > 0 ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" : "border-destructive/30 bg-destructive/5"
        )}>
          <div className="flex items-start gap-3">
            {importResult.successCount > 0 ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">
                {importResult.successCount > 0 ? "✅ IMPORT THÀNH CÔNG" : "⚠️ IMPORT CÓ LỖI"}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded px-2 py-1">
                  <span className="text-muted-foreground">Thành công:</span>
                  <span className="font-bold text-emerald-700 ml-1">{importResult.successCount}</span>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/30 rounded px-2 py-1">
                  <span className="text-muted-foreground">Trùng lặp:</span>
                  <span className="font-bold text-amber-700 ml-1">{importResult.duplicateCount}</span>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 rounded px-2 py-1">
                  <span className="text-muted-foreground">Thất bại:</span>
                  <span className="font-bold text-red-700 ml-1">{importResult.errorCount}</span>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded px-2 py-1">
                  <span className="text-muted-foreground">Tổng số:</span>
                  <span className="font-bold text-blue-700 ml-1">{importResult.total}</span>
                </div>
              </div>
              
              {importResult.duplicates && importResult.duplicates.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs font-medium cursor-pointer text-amber-600 hover:text-amber-700">
                    🔁 Xem danh sách sản phẩm trùng lặp ({importResult.duplicates.length})
                  </summary>
                  <div className="mt-2 max-h-32 overflow-auto rounded bg-amber-50 dark:bg-amber-950/20 p-2">
                    {importResult.duplicates.slice(0, 20).map((dup, idx) => (
                      <div key={idx} className="text-xs py-1 border-b border-amber-200 last:border-0">
                        <span className="font-medium">{dup.name}</span>
                        <span className="text-muted-foreground ml-2">- {dup.reason}</span>
                      </div>
                    ))}
                    {importResult.duplicates.length > 20 && (
                      <p className="text-xs text-muted-foreground mt-1">... và {importResult.duplicates.length - 20} sản phẩm trùng khác</p>
                    )}
                  </div>
                </details>
              )}
              
              {importResult.errors && importResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs font-medium cursor-pointer text-red-600 hover:text-red-700">
                    ❌ Xem chi tiết lỗi ({importResult.errors.length})
                  </summary>
                  <div className="mt-2 max-h-32 overflow-auto rounded bg-red-50 dark:bg-red-950/20 p-2">
                    {importResult.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="text-xs py-1 border-b border-red-200 last:border-0">{err}</div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-xs text-muted-foreground mt-1">... và {importResult.errors.length - 10} lỗi khác</p>
                    )}
                  </div>
                </details>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="shrink-0 rounded p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Package, label: "Tổng sản phẩm", value: totalProducts, bg: "bg-primary/10", color: "text-primary" },
          { icon: AlertCircle, label: "Sắp hết hàng", value: lowStockCount, bg: "bg-amber-100", color: "text-amber-700" },
          { icon: Warehouse, label: "Hết hàng", value: outOfStockCount, bg: "bg-destructive/10", color: "text-destructive" },
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
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
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading} title="Tải lại">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

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

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[300px]">Sản phẩm</TableHead>
              <TableHead>Mã SKU</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Giá nhập</TableHead>
              <TableHead className="text-right">Giá bán</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead className="text-right">Tồn kho</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Không tìm thấy sản phẩm</p>
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
                      className={cn("cursor-pointer transition-colors", isExpanded ? "bg-primary/5 hover:bg-primary/5" : "hover:bg-muted/40")}
                      onClick={() => handleToggleRow(product.id)}
                    >
                      <TableCell className="font-semibold text-primary">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{product.sku || "--"}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{formatPrice(product.cost)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatPrice(product.price)}</TableCell>
                      <TableCell className="text-right tabular-nums">{product.stock.toLocaleString("vi-VN")} {product.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">{product.tonKhoHienTai.toLocaleString("vi-VN")} {product.unit}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", status.className)}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={9} className="p-0">
                          <div className="border-t bg-muted/10 px-6 py-5">
                            <Tabs key={product.id} defaultValue="product-info">
                              <TabsList className="h-9 rounded-lg bg-muted/60 p-1">
                                <TabsTrigger value="product-info" className="gap-1.5 rounded-md px-4 text-xs">
                                  <Info className="h-3.5 w-3.5" /> Thông tin
                                </TabsTrigger>
                                <TabsTrigger value="purchase-history" className="gap-1.5 rounded-md px-4 text-xs">
                                  <History className="h-3.5 w-3.5" /> Lịch sử nhập
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="product-info" className="mt-4">
                                <Card className="overflow-hidden shadow-sm">
                                  <CardContent className="p-5">
                                    <ProductForm
                                      key={product.id}
                                      product={product}
                                      danhMucs={danhMucs}
                                      setDanhMucs={setDanhMucs}
                                      suppliers={suppliers}
                                      onSave={(data) => handleSaveProduct({ ...data, id: product.id }, true)}
                                      onCancel={() => setExpandedRowId(null)}
                                      onDelete={(p) => setDeleteTarget(p)}
                                      saving={saving}
                                      compact
                                    />
                                  </CardContent>
                                </Card>
                              </TabsContent>

                              <TabsContent value="purchase-history" className="mt-4">
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

      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        {!loading && !fetchError && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            Hiển thị <PageSizeSelect pageSize={pageSize} onChange={setPageSize} /> / {totalItems} sản phẩm
          </p>
        )}
        <PaginationWrapper currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
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

      <ProductImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportProducts}
        isImporting={isImporting}
        categories={danhMucs}
        suppliers={suppliers}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <span className="font-semibold">{deleteTarget?.name}</span>? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Xóa sản phẩm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}