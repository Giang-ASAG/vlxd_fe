import api from "@/src/lib/api-client";

export const ProductService = {
  /**
   * Lấy danh sách sản phẩm
   */
  getAll: () => api.get("/SanPhams"),

  /**
   * Lấy chi tiết một sản phẩm
   */
  getById: (id) => api.get(`/SanPhams/${id}`),

  /**
   * Tạo sản phẩm mới
   */
  create: (data) => api.post("/SanPhams", { ...data, maSanPham: 0, ngayTao: data.ngayTao ?? new Date().toISOString() }),

  /**
   * Cập nhật sản phẩm
   */
  update: (id, data) => api.put(`/SanPhams/${id}`, { maSanPham: 0, ...data }),

  /**
   * Xóa sản phẩm
   */
  delete: (id) => api.delete(`/SanPhams/${id}`),
};

export const CategoryService = {
  /**
   * Lấy danh sách danh mục
   */
  getAll: () => api.get("/DanhMucs"),

  /**
   * Tạo danh mục mới
   */
  create: (data) => api.post("/DanhMucs", data),

  /**
   * Cập nhật danh mục
   */
  update: (id, data) => api.put(`/DanhMucs/${id}`, data),

  /**
   * Xóa danh mục
   */
  delete: (id) => api.delete(`/DanhMucs/${id}`),
};

const UNIT_STORAGE_KEY = "vlxd_units";
const DEFAULT_UNITS = [
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

function loadUnits() {
  if (typeof window === "undefined") return DEFAULT_UNITS;
  const raw = window.localStorage.getItem(UNIT_STORAGE_KEY);
  if (!raw) return DEFAULT_UNITS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_UNITS;
  } catch {
    return DEFAULT_UNITS;
  }
}

function saveUnits(units) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(units));
  }
  return units;
}

export const UnitService = {
  getAll: () => Promise.resolve({ data: loadUnits() }),
  create: (unit) => {
    const normalized = String(unit || "").trim();
    if (!normalized) return Promise.reject(new Error("Đơn vị tính không được để trống"));
    const units = loadUnits();
    if (units.includes(normalized)) return Promise.reject(new Error("Đơn vị tính đã tồn tại"));
    const next = [...units, normalized];
    return Promise.resolve({ data: saveUnits(next) });
  },
  update: (oldUnit, newUnit) => {
    const normalizedNew = String(newUnit || "").trim();
    if (!normalizedNew) return Promise.reject(new Error("Đơn vị tính không được để trống"));
    const units = loadUnits();
    if (!units.includes(oldUnit)) return Promise.reject(new Error("Đơn vị tính cũ không tồn tại"));
    if (oldUnit !== normalizedNew && units.includes(normalizedNew)) return Promise.reject(new Error("Đơn vị tính đã tồn tại"));
    const next = units.map((u) => (u === oldUnit ? normalizedNew : u));
    return Promise.resolve({ data: saveUnits(next) });
  },
  delete: (unit) => {
    const units = loadUnits();
    const next = units.filter((u) => u !== unit);
    return Promise.resolve({ data: saveUnits(next) });
  },
  DEFAULT_UNITS,
};

export const BrandService = {
  /**
   * Lấy danh sách thương hiệu
   */
  getAll: () => api.get("/ThuongHieus"),

  /**
   * Tạo thương hiệu mới
   */
  create: (data) => api.post("/ThuongHieus", data),
};

export const CustomerService = {
  /**
   * Lấy danh sách khách hàng với thống kê
   */
  getAll: () => api.get("/KhachHangs/thong-ke"),

  /**
   * Lấy chi tiết một khách hàng
   */
  getById: (id) => api.get(`/KhachHangs/${id}`),

  /**
   * Tạo khách hàng mới
   */
  create: (data) => api.post("/KhachHangs", data),

  /**
   * Cập nhật khách hàng
   */
  update: (id, data) => api.put(`/KhachHangs/${id}`, { maKhachHang: id, ...data }),

  /**
   * Xóa khách hàng
   */
  delete: (id) => api.delete(`/KhachHangs/${id}`),
};

export const SupplierService = {
  /**
   * Lấy danh sách nhà cung cấp với thống kê
   */
  getAll: () => api.get("/NhaCungCaps/danhsachthongkencc"),

  /**
   * Lấy chi tiết một nhà cung cấp
   */
  getById: (id) => api.get(`/NhaCungCaps/${id}`),

  /**
   * Tạo nhà cung cấp mới
   */
  create: (data) => api.post("/NhaCungCaps", data),

  /**
   * Cập nhật nhà cung cấp
   */
  update: (id, data) => api.put(`/NhaCungCaps/${id}`, { maNcc: id, ...data }),

  /**
   * Xóa nhà cung cấp
   */
  delete: (id) => api.delete(`/NhaCungCaps/${id}`),
};

export const ThongKeService = {
  /**
   * Báo cáo tài chính theo ngày/tháng/quý/năm
   * groupBy: day | month | quarter | year
   * dau, cuoi: YYYY-MM-DD
   */
  donHangGanNhat: () => api.get("/ThongKe/donhangGanNhat"),
  doanhThuTuan: () => api.get("/ThongKe/doanhthuTuan"), 
  homNay:         () => api.get("/ThongKe/homnay"),   
  spBanChay: (limit = 5) => api.get(`/ThongKe/spBanChay?limit=${limit}`), 
  baoCaoTaiChinh: ({ dau, cuoi, groupBy }) =>
    api.get(`/ThongKe/bao-cao-tai-chinh-theo-ngay?dau=${encodeURIComponent(dau)}&cuoi=${encodeURIComponent(cuoi)}&groupBy=${encodeURIComponent(groupBy)}`),
};

export const PurchaseOrderService = {
  /**
   * Danh sách phiếu nhập hàng
   */
  getAll: () => api.get("/PhieuNhapKhos"),

  /**
   * Chi tiết phiếu nhập
   */
  getById: (id) => api.get(`/PhieuNhapKhos/${id}`),

  /**
   * Tạo phiếu nhập hàng
   */
  create: (data) => api.post("/PhieuNhapKhos", data),

  /**
   * Nhập thêm hàng cho sản phẩm đã có
   */
  nhapThemHang: (data) => api.post("/PhieuNhapKhos/nhap-them-hang", data),
};
export const SupplierPaymentService = {
  /**
   * Lịch sử thanh toán nhà cung cấp
   */
  getAll: () => api.get("/CongNoNccs"),

  /**
   * Tạo thanh toán cho nhà cung cấp
   */
  create: (data) => api.post("/CongNoNccs", data),
};
export const InvoiceService = {
  /**
   * Lấy danh sách hoá đơn
   */
  getAll: () => api.get("/DonHangs/HoaDon"),
};
export const CongNoNccService = {
  getBySupplier: (supplierId) => api.get(`/CongNoNccs/nha-cung-cap/${supplierId}`),
};

export const LichSuThanhToanService = {
  getBy: (id, isNcc) => api.get(`/LichSuThanhToans/${id}?isNcc=${isNcc}`),
  create: (records) => api.post("/LichSuThanhToans", records),
};
export const CongNoKhachHangService = {
  getByCustomer: (customerId) =>
    api.get(`/CongNoKhachHang/khach-hang/${customerId}?pageNumber=1&pageSize=20`),
};

