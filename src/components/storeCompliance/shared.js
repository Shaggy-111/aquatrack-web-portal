export const CARD_STATUSES = ["PENDING_CARD", "CARD_UPLOADED"];
export const PAYMENT_STATUSES = ["NO_INVOICE", "UNPAID", "PARTIALLY_PAID", "PAID"];
export const PAYMENT_MODES = ["UPI", "IMPS", "NEFT", "BANK_TRANSFER", "CASH", "OTHER"];
export const FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
export const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
export const label = (value) => String(value || "—").replace(/_/g, " ");
export const period = (row) => `${new Date(2000, Number(row.month) - 1).toLocaleString("en-IN", { month: "long" })} ${row.year}`;
export const timestamp = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";
export const localDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fileError = (file) => {
  if (!file) return "Choose a file.";
  if (!file.size) return "The file is empty.";
  if (file.size > 10 * 1024 * 1024) return "Maximum file size is 10 MB.";
  if (!/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) return "Supported formats: JPEG, PNG, WEBP, PDF.";
  return "";
};
export const currencyValid = (value) => /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value) > 0;
export const errorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((entry) => entry.msg || "Invalid value").join("; ");
  return error?.message || "Request failed. Please try again.";
};
export const capabilities = (role, hasPermission) => {
  const normalized = String(role || "").toLowerCase().replace(/[\s_-]/g, "");
  const superAdmin = normalized === "superadmin";
  const allowed = (action) => superAdmin || (normalized === "employee" && hasPermission(`store_compliance.${action}`));
  return { superAdmin, view: allowed("view"), create: allowed("create"), upload: allowed("upload"), export: allowed("export"), invoice: superAdmin, payment: superAdmin, void: superAdmin };
};
