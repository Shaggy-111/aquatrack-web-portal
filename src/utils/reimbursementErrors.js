// API errors must become text before entering React state used by JSX.
export function reimbursementError(error, fallback = "Request failed.") {
  const describe = (value, depth = 0) => {
    if (depth > 8 || value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map((item) => describe(item, depth + 1)).filter(Boolean).join("; ");
    if (typeof value === "object") {
      const message = describe(value.msg ?? value.message ?? value.detail, depth + 1);
      const location = Array.isArray(value.loc) ? value.loc.filter((part) => typeof part === "string" || typeof part === "number").join(".") : "";
      if (message) return location ? `${location}: ${message}` : message;
      return Object.entries(value).map(([key, item]) => `${key}: ${describe(item, depth + 1)}`).join("; ");
    }
    return "";
  };
  return describe(error?.response?.data?.detail) || describe(error?.message) || fallback;
}

export function buildReimbursementCreatePayload(values) {
  if (typeof values.store_id !== "string" || !values.store_id.trim()) throw new Error("Choose a Store before submitting the claim.");
  const purchaseDate = String(values.purchase_date ?? "").trim();
  const date = new Date(`${purchaseDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== purchaseDate) throw new Error("Enter a valid purchase date (YYYY-MM-DD).");
  const rawAmount = String(values.total_amount ?? "").trim();
  const amount = Number(rawAmount);
  if (!rawAmount || !Number.isFinite(amount) || amount <= 0) throw new Error("Total amount must be greater than zero.");
  const reason = String(values.reason ?? "").trim();
  if (reason.length < 3) throw new Error("Reason must be at least 3 characters.");
  const payload = { store_id: values.store_id, purchase_date: purchaseDate, total_amount: amount, reason };
  for (const key of ["poc_id", "instructed_by_user_id"]) {
    const raw = String(values[key] ?? "").trim();
    if (!raw) continue;
    const id = Number(raw);
    if (!Number.isSafeInteger(id)) throw new Error(`${key} must be an integer.`);
    payload[key] = id;
  }
  const notes = String(values.notes ?? "").trim();
  if (notes) payload.notes = notes;
  return payload;
}
