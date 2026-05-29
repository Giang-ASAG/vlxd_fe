export function toNumber(value) {
  const normalized = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(amount) {
  return `${new Intl.NumberFormat("en-US").format(toNumber(amount))} đ`;
}

export function formatMoneyInput(value) {
  if (value === "" || value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US").format(toNumber(value));
}

export function parseMoneyInput(value) {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  return raw ? Number(raw) : "";
}
