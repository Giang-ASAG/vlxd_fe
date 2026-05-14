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
