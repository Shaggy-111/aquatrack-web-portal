import service from "./storeComplianceMonthlyService";
import api from "./apiClient";
jest.mock("./apiClient", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
const base = "/store-compliance/monthly";
const file = new File(["file"], "card.webp", { type: "image/webp" });
beforeEach(() => { jest.clearAllMocks(); [api.get, api.post, api.patch].forEach((method) => method.mockResolvedValue({ data: { id: 9 } })); });
test("list preserves false and exact pagination, strips unsupported/empty filters", async () => {
  await service.listMonthlyCompliance({ has_invoice: false, outstanding_only: false, page: 2, page_size: 10, month: "", city: "Delhi", region: "NORTH" });
  expect(api.get).toHaveBeenCalledWith(base, { params: { has_invoice: false, outstanding_only: false, page: 2, page_size: 10, region: "NORTH" } });
});
test("summary sends only actual backend summary scope", async () => {
  await service.getMonthlySummary({ year: 2026, month: 10, region: "NORTH", channel: "BLINKIT", entity: "AMB", store_id: "S1", search: "x", page: 2 });
  expect(api.get).toHaveBeenCalledWith(`${base}/summary`, { params: { year: 2026, month: 10, region: "NORTH", channel: "BLINKIT", entity: "AMB" } });
});
test("export returns response headers and blob without pagination", async () => {
  const response = { data: new Blob(["excel"]), headers: { "content-disposition": "attachment; filename=report.xlsx" } }; api.get.mockResolvedValue(response);
  expect(await service.exportMonthlyCompliance({ page: 2, has_invoice: false })).toBe(response);
  expect(api.get).toHaveBeenCalledWith(`${base}/export`, { params: { has_invoice: false }, responseType: "blob" });
});
test("create/detail use record IDs and JSON create payload", async () => {
  const payload = { store_id: "S1", year: 2026, month: 10, card_remarks: null };
  await service.createMonthlyCompliance(payload); expect(api.post).toHaveBeenCalledWith(base, payload);
  await service.getMonthlyDetail(9); expect(api.get).toHaveBeenCalledWith(`${base}/9`);
});
test("card multipart has file/remarks, progress, no boundary or week", async () => {
  const progress = jest.fn(); await service.uploadMonthlyCard(9, file, "card", progress);
  const [url, body, config] = api.post.mock.calls[0];
  expect(url).toBe(`${base}/9/card`); expect(Object.fromEntries(body.entries())).toEqual({ file, remarks: "card" }); expect(config).toEqual({ onUploadProgress: progress });
});
test("invoice create and PATCH are multipart; remarks-only PATCH has no immutable fields", async () => {
  const payload = { invoice_number: "INV-1", invoice_date: "2026-10-15", invoice_amount: "10000.00", file, remarks: "Invoice" };
  await service.createInvoice(9, payload); expect(api.post.mock.calls[0][0]).toBe(`${base}/9/invoice`); expect(Object.fromEntries(api.post.mock.calls[0][1].entries())).toEqual(payload);
  await service.updateInvoice(9, { remarks: "Paid" }); expect(api.patch.mock.calls[0][0]).toBe(`${base}/9/invoice`); expect(Object.fromEntries(api.patch.mock.calls[0][1].entries())).toEqual({ remarks: "Paid" });
});
test("payment JSON and proof link use exact IDs", async () => {
  const payload = { amount: "4000", payment_date: "2026-10-15T09:00:00.000Z", payment_mode: "UPI", transaction_reference: null, remarks: null };
  await service.recordPayment(9, payload); expect(api.post).toHaveBeenCalledWith(`${base}/9/payments`, payload);
  await service.uploadAttachment(9, { file, attachment_type: "PAYMENT_PROOF", payment_id: 27, invoice_id: 11 });
  expect(Object.fromEntries(api.post.mock.calls[1][1].entries())).toEqual({ file, attachment_type: "PAYMENT_PROOF", payment_id: "27", invoice_id: "11" });
});
test("void is POST with mandatory void_reason, no delete", async () => {
  await service.voidAttachment(9, 12, "Wrong proof"); expect(api.post).toHaveBeenCalledWith(`${base}/9/attachments/12/void`, { void_reason: "Wrong proof" });
});
test("Store sources distinguish Employee and SuperAdmin without fallback", async () => {
  await service.listStores(false); expect(api.get).toHaveBeenLastCalledWith("/employees/me/stores");
  await service.listStores(true); expect(api.get).toHaveBeenLastCalledWith("/store/store/list/all");
  api.get.mockRejectedValue(new Error("scope failed")); await expect(service.listStores(false)).rejects.toThrow("scope failed"); expect(api.get).toHaveBeenCalledTimes(3);
});
