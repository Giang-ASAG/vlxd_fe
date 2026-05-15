"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, X, Plus, Minus, Trash2, CreditCard, Banknote,
  ArrowLeft, User, ShoppingCart, Package, UserCheck,
  AlertCircle, Loader2, RefreshCw, CheckCircle2, Printer,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPrintDraft, POS_PRINT_DRAFT_KEY } from "@/lib/pos-print";
import { getSession } from "@/src/auth/session";
import api from "@/src/lib/api-client";

// ── Tiện ích ──────────────────────────────────────────────────────────────────

function parseAmountDisplay(value) {
  return Number(String(value).replace(/\D/g, "")) || 0;
}

function toText(value) {
  return value == null ? "" : String(value);
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** Bỏ dấu tiếng Việt để so sánh không phân biệt dấu */
function removeAccents(str) {
  return toText(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Map khách hàng từ API → format nội bộ */
function mapCustomer(c) {
  return {
    id: toText(c.maKhachHang),
    name: toText(c.hoTen),
    phone: toText(c.soDienThoai),
    address: toText(c.diaChi),
    hanMucNo: toNumber(c.hanMucNo),
  };
}

/**
 * Tính trạng thái tồn kho dựa trên tổng tồn kho (soLuong + tonKhoHienTai)
 */
function getStockStatus(totalStock) {
  if (totalStock <= 0) return { label: "Hết hàng", className: "bg-destructive/10 text-destructive border-destructive/20" };
  if (totalStock <= 100) return { label: "Sắp hết", className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Còn hàng", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

export default function POSPage() {
  // ── Dữ liệu từ API ───────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["Tất cả"]);
  const [customers, setCustomers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // ── Trạng thái POS ───────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerListOpen, setCustomerListOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [linePriceEdit, setLinePriceEdit] = useState(null);
  const [qtyEdit, setQtyEdit] = useState(null);

  // ── Cảnh báo tồn kho ─────────────────────────────────────────────────────
  const [stockWarningOpen, setStockWarningOpen] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState([]);

  const searchRef = useRef(null);
  const customerInputRef = useRef(null);

  // ── Fetch toàn bộ dữ liệu ban đầu ───────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      setFetchError(null);

      const [spJson, dmJson, khJson] = await Promise.all([
        api.get("/SanPhams"),
        api.get("/DanhMucs"),
        api.get("/KhachHangs"),
      ]);

      const dmList = dmJson?.data ?? [];
      const dmMap = Object.fromEntries(dmList.map((d) => [d.maDanhMuc, d.tenDanhMuc]));

      setProducts(
        (spJson?.data ?? []).map((p) => {
          const stock = toNumber(p.soLuong ?? 0);
          const currentInventory = toNumber(p.tonKhoHienTai ?? 0);
          const totalStock = stock + currentInventory;

          return {
            id: toText(p.maSanPham),
            name: toText(p.tenSanPham),
            sku: toText(p.maSku),
            price: toNumber(p.giaBanLe),
            cost: toNumber(p.giaNhapGanNhat),
            unit: toText(p.donViChinh) || "Cái",
            category: dmMap[p.maDanhMuc] ?? "Khác",
            stock,           // soLuong — tồn kệ (shelf)
            tonKhoHienTai: currentInventory,  // tồn kho (warehouse)
            totalStock,
            status: getStockStatus(totalStock),
          };
        })
      );
      setCategories(["Tất cả", ...dmList.map((d) => d.tenDanhMuc).filter(Boolean)]);
      setCustomers((khJson?.data ?? []).map(mapCustomer));
    } catch (err) {
      console.error(err);
      setFetchError(
        err.message.includes("Failed to fetch")
          ? "Không thể kết nối đến server. Kiểm tra API đang chạy chưa."
          : `Lỗi: ${err.message}`
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Giá trị phái sinh ────────────────────────────────────────────────────
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = useMemo(() => {
    const q = removeAccents(customerQuery);
    if (!q) return customers;
    return customers.filter(
      (c) =>
        removeAccents(c.name).includes(q) ||
        toText(c.phone).replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  }, [customerQuery, customers]);

  const searchTrimmed = search.trim();
  const hasSearchQuery = searchTrimmed.length > 0;

  const filteredProducts = useMemo(() => {
    if (!hasSearchQuery) return [];
    const q = removeAccents(searchTrimmed);
    return products.filter((p) => {
      const matchSearch =
        removeAccents(p.name).includes(q) ||
        removeAccents(p.sku).includes(q);
      const matchCat =
        selectedCategory === "Tất cả" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [hasSearchQuery, searchTrimmed, selectedCategory, products]);

  const subtotal = cart.reduce((s, i) => s + toNumber(i.price) * toNumber(i.quantity), 0);
  const total = subtotal - discount;
  const paidAmount = parseAmountDisplay(amountPaid);
  const shortfall = Math.max(0, total - paidAmount);
  const change = paidAmount > total ? paidAmount - total : 0;

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    setAmountPaid(total > 0 ? new Intl.NumberFormat("vi-VN").format(total) : "");
  }, [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F9" && cart.length) { e.preventDefault(); handleCheckoutIntent(); }
      if (e.key === "Escape") { setSearch(""); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (n) => new Intl.NumberFormat("vi-VN").format(toNumber(n));

  const handleOpenPrintPage = useCallback(() => {
    if (cart.length === 0) return;

    const draft = createPrintDraft({
      cart,
      selectedCustomer,
      paymentMethod,
      discount,
      amountPaid: paidAmount,
    });

    window.localStorage.setItem(POS_PRINT_DRAFT_KEY, JSON.stringify(draft));

    const printWindow = window.open("/pos/print", "_blank");
    if (!printWindow) {
      window.location.assign("/pos/print");
    }
  }, [cart, discount, paidAmount, paymentMethod, selectedCustomer]);

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.totalStock) return prev;
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity: 1,
          maxStock: product.totalStock,
          // Giữ lại stock (tồn kệ) và tonKhoHienTai (kho) để kiểm tra sau
          stock: product.stock,
          tonKhoHienTai: product.tonKhoHienTai,
        },
      ];
    });
  }, []);

  const addToCartFromSearch = useCallback(
    (p) => { addToCart(p); setSearch(""); searchRef.current?.focus(); },
    [addToCart]
  );

  const updateQuantity = (id, delta) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const qty = item.quantity + delta;
      if (qty <= 0) return prev.filter((i) => i.id !== id);
      if (qty > item.maxStock) return prev;
      return prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i));
    });
  };

  const commitQuantity = (id, raw) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      let n = parseInt(String(raw).replace(/\D/g, ""), 10);
      if (!Number.isFinite(n) || n <= 0) n = 1;
      return prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(n, i.maxStock) } : i));
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomerId("");
    setCustomerQuery("");
    setAmountPaid("");
    setPaymentMethod(false);
    setSubmitError(null);
    setCheckoutSuccess(false);
  };

  const selectCustomer = (c) => {
    setSelectedCustomerId(c.id);
    setCustomerQuery(c.name);
    setCustomerListOpen(false);
  };

  const clearCustomerSelection = () => {
    setSelectedCustomerId("");
    setCustomerQuery("");
  };

  const session = getSession();

  // ── Kiểm tra tồn kho trước khi mở thanh toán ─────────────────────────────
  /**
   * Các item cần lấy thêm từ kho = item.quantity > item.stock (tồn kệ)
   * Phần thiếu = item.quantity - item.stock → lấy từ item.tonKhoHienTai
   */
  const handleCheckoutIntent = useCallback(() => {
    if (cart.length === 0) return;

    const needWarehouse = cart.filter(
      (item) => item.quantity > (item.stock ?? 0)
    );

    if (needWarehouse.length > 0) {
      setStockWarningItems(needWarehouse);
      setStockWarningOpen(true);
    } else {
      setCheckoutOpen(true);
    }
  }, [cart]);

  /** Người dùng đồng ý lấy hàng từ kho bù vào */
  const handleWarehouseConfirm = () => {
    setStockWarningOpen(false);
    setCheckoutOpen(true);
  };

  // ── Gửi đơn hàng ─────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload = {
        donHang: {
          maDonHang: 0,
          maKhachHang: selectedCustomer ? Number(selectedCustomer.id) : 1,
          maNguoiTao: session.user?.sub ? Number(session.user.sub) : 1,
          ngayTao: new Date().toISOString(),
          tongTien: total,
          trangThaiThanhToan: paidAmount >= total ? "da_thanh_toan" : "tra_mot_phan",
          hinhThuc: paymentMethod,
          soTienTra: paidAmount,
        },
        chiTietDonHangs: cart.map((item) => ({
          id: 0,
          maSanPham: Number(item.id),
          soLuong: item.quantity,
          donViTinh: item.unit,
          donGia: item.price,
          thanhTien: item.price * item.quantity,
        })),
      };

      await api.post("/DonHangs/themgiohang", payload);

      setCheckoutSuccess(true);
    } catch (err) {
      setSubmitError(
        err.message.includes("Failed to fetch")
          ? "Không thể kết nối server khi gửi đơn hàng."
          : `Lỗi gửi đơn: ${err.message}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    clearCart();
    setCheckoutOpen(false);
  };

  // ── Category Filters ─────────────────────────────────────────────────────
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background">

      {/* ── Panel trái ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col border-r min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b bg-card/95 backdrop-blur-sm p-4 shrink-0 shadow-sm">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Thoát</span>
          </Link>

          <div className="flex-1 max-w-xl">
            <div className="relative z-50">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <Input
                ref={searchRef}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                placeholder={loadingData ? "Đang tải sản phẩm..." : "Tìm sản phẩm (F2)..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                disabled={loadingData}
                aria-expanded={hasSearchQuery}
                aria-controls="pos-product-search-panel"
                className={cn(
                  "pl-11 h-12 text-lg bg-muted/50 border-muted focus:bg-background transition-colors relative z-10",
                  search && "pr-11"
                )}
              />
              {loadingData && (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground animate-spin z-10" />
              )}
              {search && !loadingData && (
                <Button
                  variant="ghost" size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 rounded-lg hover:bg-muted"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* Dropdown kết quả tìm kiếm */}
              {hasSearchQuery && !loadingData && (
                <div
                  id="pos-product-search-panel"
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-2 rounded-xl border bg-card shadow-lg overflow-hidden"
                >
                  <div className="max-h-[min(40vh,280px)] overflow-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        Không có sản phẩm phù hợp
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredProducts.map((product) => {
                          const isOutOfStock = product.totalStock <= 0;
                          const status = product.status;
                          return (
                            <button
                              key={product.id}
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => addToCartFromSearch(product)}
                              className={cn(
                                "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors",
                                isOutOfStock && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.sku} · {product.category}
                                </p>
                                <div className="mt-1">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                    status.className
                                  )}>
                                    {status.label}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-sm text-primary">
                                  {fmt(product.price)}đ
                                </p>
                                <p className="text-xs text-muted-foreground">/{product.unit}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Tồn: {product.totalStock}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 gap-2 px-4 rounded-lg"
              disabled={cart.length === 0}
              onClick={handleOpenPrintPage}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">In</span>
            </Button>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
            {fetchError ? (
              <Button variant="ghost" size="sm" onClick={loadData}
                className="text-destructive hover:text-destructive gap-1">
                <RefreshCw className="h-4 w-4" />
                Thử lại
              </Button>
            ) : (
              <>
                <span className="hidden md:inline">F2: Tìm kiếm</span>
                <span className="hidden md:inline">|</span>
                <span className="hidden md:inline">F9: Thanh toán</span>
              </>
            )}
          </div>
        </header>

        {/* Category Filter Bar */}
        {!loadingData && products.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4 border-b pb-3">
            {categories.slice(0, 8).map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="text-sm rounded-full px-4 h-8"
              >
                {cat}
              </Button>
            ))}
            {categories.length > 8 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="text-sm rounded-full px-4 h-8"
              >
                {showCategoryFilter ? "Thu gọn" : "Xem thêm"}
              </Button>
            )}
          </div>
        )}

        {showCategoryFilter && categories.length > 8 && (
          <div className="flex flex-wrap gap-2 px-4 pt-2 pb-3 border-b">
            {categories.slice(8).map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="text-sm rounded-full px-4 h-8"
              >
                {cat}
              </Button>
            ))}
          </div>
        )}

        {/* Thông báo lỗi fetch */}
        {fetchError && (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Giỏ hàng */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              Hàng đã chọn
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {cart.reduce((s, i) => s + i.quantity, 0)} SP
                </Badge>
              )}
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}
                className="text-destructive hover:text-destructive gap-1">
                <Trash2 className="h-4 w-4" />
                Xóa tất cả
              </Button>
            )}
          </div>

          {loadingData && cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground gap-3">
              <Loader2 className="h-10 w-10 animate-spin opacity-40" />
              <p className="text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-sm mt-4 font-medium">Chưa có hàng trên đơn</p>
              <p className="text-xs mt-1">Tìm kiếm phía trên rồi chọn để thêm</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="grid gap-3 px-4 py-3 text-xs font-medium text-muted-foreground border-b bg-muted/40 items-center"
                    style={{ gridTemplateColumns: "minmax(0,1.4fr) 144px 100px 148px 112px 40px" }}
                  >
                    <div>Sản phẩm</div>
                    <div>Giá vốn</div>
                    <div className="text-right">Giá bán</div>
                    <div className="text-center">Số lượng</div>
                    <div className="text-right">Thành tiền</div>
                    <div className="sr-only">Thao tác</div>
                  </div>

                  {cart.map((item) => {
                    const needsWarehouse = item.quantity > (item.stock ?? 0);
                    const warehouseNeeded = needsWarehouse
                      ? item.quantity - (item.stock ?? 0)
                      : 0;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "grid gap-3 px-4 py-3 border-b border-border last:border-b-0 items-center hover:bg-muted/30 transition-colors",
                          needsWarehouse && "bg-amber-50/50 dark:bg-amber-950/10"
                        )}
                        style={{ gridTemplateColumns: "minmax(0,1.4fr) 144px 100px 148px 112px 40px" }}
                      >
                        {/* Tên */}
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-snug line-clamp-2">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.sku}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Tồn kệ: {item.stock ?? 0} · Kho: {item.tonKhoHienTai ?? 0} {item.unit}
                            </p>
                            {needsWarehouse && (
                              <p className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                                <Warehouse className="h-3 w-3 shrink-0" />
                                Cần lấy {warehouseNeeded} {item.unit} từ kho
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Giá vốn */}
                        <div className="text-sm text-muted-foreground font-mono">{fmt(item.cost ?? 0)}đ</div>

                        {/* Giá bán editable */}
                        <div className="text-right">
                          <Input
                            className="h-9 text-right font-medium text-sm px-2 rounded-lg"
                            inputMode="numeric"
                            value={linePriceEdit?.id === item.id ? linePriceEdit.raw : fmt(item.price)}
                            onFocus={() => setLinePriceEdit({ id: item.id, raw: String(item.price) })}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setLinePriceEdit((p) => p?.id === item.id ? { ...p, raw } : p);
                            }}
                            onBlur={() => {
                              if (linePriceEdit?.id !== item.id) return;
                              const price = Math.max(0, Number(linePriceEdit.raw) || 0);
                              setCart((c) => c.map((i) => i.id === item.id ? { ...i, price } : i));
                              setLinePriceEdit(null);
                            }}
                          />
                        </div>

                        {/* Số lượng */}
                        <div className="flex items-center gap-1 justify-center">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-lg"
                            onClick={() => { setQtyEdit(null); updateQuantity(item.id, -1); }}
                            aria-label="Giảm">
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            className="h-8 w-14 text-center font-medium text-sm px-1 rounded-lg"
                            inputMode="numeric"
                            value={qtyEdit?.id === item.id ? qtyEdit.raw : String(item.quantity)}
                            onFocus={() => setQtyEdit({ id: item.id, raw: String(item.quantity) })}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setQtyEdit((p) => p?.id === item.id ? { ...p, raw } : p);
                            }}
                            onBlur={() => {
                              if (qtyEdit?.id !== item.id) return;
                              commitQuantity(item.id, qtyEdit.raw);
                              setQtyEdit(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (qtyEdit?.id === item.id) {
                                  commitQuantity(item.id, qtyEdit.raw);
                                  setQtyEdit(null);
                                }
                                e.currentTarget.blur();
                              }
                            }}
                          />
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-lg"
                            onClick={() => { setQtyEdit(null); updateQuantity(item.id, 1); }}
                            disabled={item.quantity >= item.maxStock}
                            aria-label="Tăng">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Thành tiền */}
                        <div className="text-right font-bold text-sm text-primary font-mono">
                          {fmt(item.price * item.quantity)}đ
                        </div>

                        {/* Xóa */}
                        <div className="flex justify-end">
                          <Button type="button" variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0 rounded-lg"
                            onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel phải ─────────────────────────────────────────────────────── */}
      <div className="w-[400px] flex flex-col bg-card border-l shrink-0 relative shadow-lg">

        {/* Chọn khách hàng */}
        <div className="p-5 border-b">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Khách hàng</span>
            {loadingData && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={customerInputRef}
              className="pl-9 pr-9 rounded-lg"
              placeholder="Tìm tên hoặc SĐT..."
              value={customerQuery}
              disabled={loadingData}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setSelectedCustomerId("");
                setCustomerListOpen(true);
              }}
              onFocus={() => setCustomerListOpen(true)}
            />
            {customerQuery && (
              <Button type="button" variant="ghost" size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg"
                onClick={clearCustomerSelection}>
                <X className="h-4 w-4" />
              </Button>
            )}

            {customerListOpen && filteredCustomers.length > 0 && (
              <ul className="absolute z-50 mt-2 w-full max-h-52 overflow-auto rounded-xl border bg-popover shadow-lg">
                {filteredCustomers.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCustomer(c)}
                    >
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-3 text-xs space-y-1 rounded-xl border bg-muted/30 p-3">
              <p className="text-muted-foreground">📞 {selectedCustomer.phone}</p>
              <p className="text-muted-foreground">📍 {selectedCustomer.address}</p>
              {selectedCustomer.hanMucNo > 0 && (
                <p className="text-muted-foreground">
                  💰 Hạn mức nợ: {fmt(selectedCustomer.hanMucNo)}đ
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tạm tính */}
        <div className="flex-1 overflow-auto p-5 flex flex-col justify-end min-h-0">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">
                Tạm tính ({cart.reduce((s, i) => s + i.quantity, 0)} SP)
              </span>
              <span className="font-mono">{fmt(subtotal)}đ</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-3">
              <span>Tổng cộng</span>
              <span className="text-primary font-mono">{fmt(total)}đ</span>
            </div>
          </div>
        </div>

        {/* Khách trả + nút thanh toán */}
        <div className="border-t p-5 space-y-4 bg-muted/10">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Khách trả:</span>
              <Input
                type="text"
                inputMode="numeric"
                value={amountPaid}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setAmountPaid(v ? fmt(Number(v)) : "");
                }}
                className="flex-1 text-right font-bold h-10 rounded-lg"
                placeholder="0"
              />
            </div>
            {paidAmount > 0 && paidAmount < total && (
              <div className="flex justify-between text-sm font-medium bg-amber-500/10 p-3 rounded-xl border border-amber-200">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Còn thiếu:
                </span>
                <span className="font-mono font-bold">{fmt(shortfall)}đ</span>
              </div>
            )}
            {paidAmount >= total && paidAmount > 0 && (
              <div className="flex justify-between text-sm font-medium bg-emerald-500/10 p-3 rounded-xl border border-emerald-200">
                <span>Tiền thừa:</span>
                <span className="font-mono font-bold">{fmt(change)}đ</span>
              </div>
            )}
          </div>

          {/* ── Nút thanh toán: gọi handleCheckoutIntent thay vì setCheckoutOpen ── */}
          <Button
            size="lg"
            className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground shadow-md rounded-xl"
            disabled={cart.length === 0}
            onClick={handleCheckoutIntent}
          >
            <CreditCard className="h-5 w-5" />
            Thanh toán (F9)
          </Button>
        </div>
      </div>

      {/* ── Dialog cảnh báo tồn kho ──────────────────────────────────────────── */}
      <Dialog
        open={stockWarningOpen}
        onOpenChange={(o) => { if (!o) setStockWarningOpen(false); }}
      >
        <DialogContent className="sm:max-w-[480px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                <Warehouse className="h-5 w-5 text-amber-600" />
              </div>
              Cần lấy hàng từ kho
            </DialogTitle>
            <DialogDescription>
              Một số sản phẩm vượt quá tồn kệ, cần bù thêm từ kho để đủ số lượng.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            {/* Danh sách sản phẩm cần lấy từ kho */}
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-b">
                <div className="col-span-1">Sản phẩm</div>
                <div className="text-center">Tồn kệ / Đặt</div>
                <div className="text-right">Cần lấy kho</div>
              </div>
              <div className="divide-y max-h-56 overflow-auto">
                {stockWarningItems.map((item) => {
                  const shelfStock = item.stock ?? 0;
                  const needed = item.quantity - shelfStock;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-3 gap-2 px-3 py-3 items-center text-sm"
                    >
                      <div className="col-span-1 min-w-0">
                        <p className="font-medium truncate leading-snug">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-muted-foreground font-mono">{shelfStock}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="font-semibold font-mono">{item.quantity}</span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold font-mono">
                          +{needed} {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-3 border">
              Bạn có muốn xuất hàng từ kho để bù vào đơn này không?
            </p>
          </div>

          <div className="flex gap-3 mt-1">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => setStockWarningOpen(false)}
            >
              Không đồng ý
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm"
              onClick={handleWarehouseConfirm}
            >
              <Warehouse className="h-4 w-4" />
              Đồng ý, lấy từ kho
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog thanh toán ─────────────────────────────────────────────── */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={(o) => {
          if (!o && checkoutSuccess) { handleCloseSuccess(); return; }
          if (!submitting) setCheckoutOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Thanh toán
            </DialogTitle>
            <DialogDescription>
              Hoàn tất đơn hàng và chọn phương thức thanh toán
            </DialogDescription>
          </DialogHeader>

          {/* Màn hình thành công */}
          {checkoutSuccess ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold text-xl">Đơn hàng đã ghi nhận!</p>
                <p className="text-sm text-muted-foreground">
                  Tổng: {fmt(total)}đ · Khách trả: {fmt(paidAmount)}đ
                  {change > 0 && ` · Trả lại: ${fmt(change)}đ`}
                </p>
                {selectedCustomer && (
                  <p className="text-sm text-muted-foreground">
                    Khách hàng: {selectedCustomer.name}
                  </p>
                )}
              </div>
              <Button size="lg" className="mt-2 w-full rounded-xl" onClick={handleCloseSuccess}>
                Tạo đơn mới
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Khách hàng */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Khách hàng
                </h3>
                {selectedCustomer ? (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{selectedCustomer.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearCustomerSelection} className="rounded-lg">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Khách lẻ (chưa chọn khách)</p>
                )}
              </div>

              {/* Tóm tắt đơn */}
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tạm tính ({cart.reduce((s, i) => s + i.quantity, 0)} SP)
                  </span>
                  <span className="font-mono">{fmt(subtotal)}đ</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Tổng cộng</span>
                  <span className="text-primary font-mono">{fmt(total)}đ</span>
                </div>
              </div>

              {/* Phương thức */}
              <div className="space-y-3">
                <h3 className="font-semibold">Phương thức thanh toán</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={paymentMethod === false ? "default" : "outline"}
                    className="h-14 flex-col gap-2 rounded-xl"
                    onClick={() => setPaymentMethod(false)}
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-xs">Tiền mặt</span>
                  </Button>
                  <Button
                    variant={paymentMethod === true ? "default" : "outline"}
                    className="h-14 flex-col gap-2 rounded-xl"
                    onClick={() => setPaymentMethod(true)}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">Chuyển khoản</span>
                  </Button>
                </div>
              </div>

              {/* Số tiền */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground whitespace-nowrap">Khách trả:</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={amountPaid}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      setAmountPaid(v ? fmt(Number(v)) : "");
                    }}
                    className="flex-1 text-right text-lg font-bold rounded-lg"
                    placeholder="0"
                  />
                </div>
                {paidAmount > 0 && paidAmount < total && (
                  <div className="flex justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-200">
                    <span className="font-medium flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Còn thiếu:
                    </span>
                    <span className="font-bold font-mono">{fmt(shortfall)}đ</span>
                  </div>
                )}
                {paidAmount >= total && paidAmount > 0 && (
                  <div className="flex justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-200">
                    <span className="font-medium">Tiền thừa:</span>
                    <span className="font-bold font-mono">{fmt(change)}đ</span>
                  </div>
                )}
              </div>

              {/* Lỗi gửi đơn */}
              {submitError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground gap-2 rounded-xl shadow-md"
                onClick={handleCheckout}
                disabled={submitting || cart.length === 0}
              >
                {submitting
                  ? <><Loader2 className="h-5 w-5 animate-spin" />Đang xử lý...</>
                  : <><CreditCard className="h-5 w-5" />Xác nhận thanh toán</>
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Đóng dropdown khách khi click ra ngoài */}
      {customerListOpen && (
        <button
          type="button"
          aria-label="Đóng danh sách"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => setCustomerListOpen(false)}
        />
      )}
    </div>
  );
}