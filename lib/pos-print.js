export const POS_PRINT_DRAFT_KEY = "pos-print-draft";

export const DEFAULT_PRINT_DRAFT = {
  template: "invoice",
  storeName: "BuildMart",
  storeAddress: "123 Lê Lợi, Quận 1, TP.HCM",
  storePhone: "028 1234 5678",
  invoiceCode: "HD-000001",
  deliveryCode: "PXK-000001",
  createdAt: "",
  paymentMethod: "Tiền mặt",
  createdBy: "Nhân viên bán hàng",
  cashierName: "Thu ngân",
  warehouseKeeperName: "Thủ kho",
  receiverName: "Khách lẻ",
  customerSignerName: "Khách hàng",
  customerName: "Khách lẻ",
  customerPhone: "",
  customerAddress: "",
  discount: 0,
  amountPaid: 0,
  invoiceNote:
    "Cảm ơn quý khách đã mua hàng. Vui lòng kiểm tra lại thông tin hàng hóa và số tiền trước khi rời quầy.",
  deliveryNote:
    "Phiếu xuất kho này được lập để xác nhận số lượng hàng đã bàn giao. Vui lòng đối chiếu và ký xác nhận khi nhận đủ hàng.",
  items: [],
};

function formatDateTime(value = new Date()) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toNumber(value) {
  return Number(value) || 0;
}

export function formatPrintCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(toNumber(value))}đ`;
}

export function normalizePrintDraft(raw = {}) {
  const merged = {
    ...DEFAULT_PRINT_DRAFT,
    ...raw,
  };

  return {
    ...merged,
    discount: toNumber(merged.discount),
    amountPaid: toNumber(merged.amountPaid),
    items: Array.isArray(merged.items)
      ? merged.items.map((item, index) => ({
          id: item?.id ?? `item-${index + 1}`,
          name: item?.name ?? "",
          unit: item?.unit ?? "",
          quantity: toNumber(item?.quantity),
          price: toNumber(item?.price),
        }))
      : [],
  };
}

export function createPrintDraft({
  cart = [],
  selectedCustomer,
  paymentMethod,
  discount,
  amountPaid,
}) {
  const printReference = Date.now().toString().slice(-6);
  const customerName = selectedCustomer?.name || "Khách lẻ";

  return normalizePrintDraft({
    template: "invoice",
    invoiceCode: `HD-${printReference}`,
    deliveryCode: `PXK-${printReference}`,
    createdAt: formatDateTime(new Date()),
    paymentMethod: paymentMethod ? "Chuyển khoản" : "Tiền mặt",
    receiverName: customerName,
    customerSignerName: customerName,
    customerName,
    customerPhone: selectedCustomer?.phone || "",
    customerAddress: selectedCustomer?.address || "",
    discount,
    amountPaid,
    items: cart.map((item, index) => ({
      id: item.id ?? `item-${index + 1}`,
      name: item.name,
      unit: item.unit || "",
      quantity: toNumber(item.quantity),
      price: toNumber(item.price),
    })),
  });
}
