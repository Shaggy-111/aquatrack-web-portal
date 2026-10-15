import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import StoreComplianceMonthly, { exportFilename } from "./StoreComplianceMonthly";
import service from "../services/storeComplianceMonthlyService";
let mockPermissions = { loading: false, hasPermission: () => true };
jest.mock("../hooks/usePermissions", () => () => mockPermissions);
jest.mock("../services/apiClient", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("../config", () => ({ API_BASE_URL: "https://api.example.test" }));
jest.mock("../services/storeComplianceMonthlyService", () => ({ __esModule: true, default: Object.fromEntries(["listMonthlyCompliance", "getMonthlySummary", "getMonthlyDetail", "listStores", "createMonthlyCompliance", "uploadMonthlyCard", "createInvoice", "updateInvoice", "recordPayment", "uploadAttachment", "voidAttachment", "exportMonthlyCompliance"].map((name) => [name, jest.fn()])) }));
const row = { id: 9, compliance_number: "SC-9", store_id: "S1", store_name: "Assigned Store", year: 2026, month: 10, card_status: "PENDING_CARD", has_invoice: true, invoice_amount: "10000", total_paid: "4000", outstanding_amount: "6000", payment_status: "PARTIALLY_PAID", invoice_number: "INV-1" };
const detail = { ...row, invoice: { id: 11, invoice_number: "INV-1", invoice_date: "2026-10-15", invoice_amount: "10000", remarks: "" }, payments: [], attachments: [] };
const list = { items: [row], page: 1, page_size: 20, total: 41, total_pages: 3 };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); localStorage.setItem("user_role", "superadmin"); mockPermissions = { loading: false, hasPermission: () => true };
  service.listMonthlyCompliance.mockResolvedValue(list); service.getMonthlySummary.mockResolvedValue({ total_monthly_records: 41, pending_cards: 30, total_invoice_amount: "50000", total_paid_amount: "10000", total_outstanding_amount: "40000" });
  service.listStores.mockResolvedValue([{ id: "S1", store_name: "Assigned Store" }]); service.getMonthlyDetail.mockResolvedValue(detail);
  service.recordPayment.mockResolvedValue({ id: 27, invoice_id: 11, payment_number: "CPAY-27" }); service.uploadMonthlyCard.mockResolvedValue(row); service.uploadAttachment.mockResolvedValue({ id: 44 });
  URL.createObjectURL = jest.fn(() => "blob:test"); URL.revokeObjectURL = jest.fn();
});
async function ready() { await screen.findByRole("button", { name: "SC-9" }); }
async function openDetail() { await ready(); fireEvent.click(screen.getByRole("button", { name: "SC-9" })); return screen.findByRole("dialog", { name: "SC-9" }); }
const change = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
test("loading, success, summary from server rather than page, and no weekly controls", async () => {
  render(<StoreComplianceMonthly />); expect(screen.getByText("Loading monthly records…")).toBeInTheDocument(); await ready(); expect(screen.getByText("Total Monthly Records").parentElement).toHaveTextContent("41"); expect(screen.queryByText(/Week [1-4]/)).toBeNull(); expect(screen.queryByText(/Compliance %/)).toBeNull();
});
test("empty and error with retry", async () => {
  service.listMonthlyCompliance.mockRejectedValueOnce(new Error("List unavailable")).mockResolvedValueOnce({ items: [], total: 0, total_pages: 0 }); render(<StoreComplianceMonthly />);
  expect(await screen.findByText("List unavailable")).toBeInTheDocument(); fireEvent.click(screen.getByText("Retry list")); expect(await screen.findByText("No monthly records match these filters.")).toBeInTheDocument();
});
test("server pagination, filters, false flag, and page reset", async () => {
  render(<StoreComplianceMonthly />); await ready(); fireEvent.click(screen.getByText("Next")); await waitFor(() => expect(service.listMonthlyCompliance).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, page_size: 20 })));
  change("Has Invoice", "false"); await waitFor(() => expect(service.listMonthlyCompliance).toHaveBeenLastCalledWith(expect.objectContaining({ has_invoice: false, page: 1 })));
  change("Page size", "50"); await waitFor(() => expect(service.listMonthlyCompliance).toHaveBeenLastCalledWith(expect.objectContaining({ page_size: 50, page: 1 })));
  change("Region", "NORTH"); await waitFor(() => expect(service.getMonthlySummary).toHaveBeenLastCalledWith(expect.objectContaining({ region: "NORTH" })));
});
test("search debounces requests and stale list response cannot overwrite newer results", async () => {
  render(<StoreComplianceMonthly />); await ready(); const count = service.listMonthlyCompliance.mock.calls.length;
  change("Search", "needle"); expect(service.listMonthlyCompliance).toHaveBeenCalledTimes(count);
  await waitFor(() => expect(service.listMonthlyCompliance).toHaveBeenLastCalledWith(expect.objectContaining({ search: "needle", page: 1 })));
  let resolveOld; service.listMonthlyCompliance.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce({ items: [], total: 0, total_pages: 0 });
  change("Region", "NORTH"); await waitFor(() => expect(resolveOld).toBeDefined()); change("Region", "SOUTH"); await screen.findByText("No monthly records match these filters.");
  await act(async () => resolveOld(list)); expect(screen.queryByRole("button", { name: "SC-9" })).toBeNull();
});
test("Employee Store source and financial controls hidden despite all permission grants", async () => {
  localStorage.setItem("user_role", "employee"); render(<StoreComplianceMonthly />); await openDetail(); expect(service.listStores).toHaveBeenCalledWith(false);
  expect(screen.queryByText("Edit Invoice")).toBeNull(); expect(screen.queryByText("Record Payment")).toBeNull(); expect(screen.queryByText("Void")).toBeNull(); expect(screen.getByText("Upload Monthly Card")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Upload Supporting Document")); expect(within(screen.getByLabelText("Attachment Type")).getAllByRole("option").map((item) => item.value)).toEqual(["OTHER"]);
});
test("scoped Store failure does not fall back; retry and no-assignment states", async () => {
  localStorage.setItem("user_role", "employee"); service.listStores.mockRejectedValueOnce(new Error("Scoped Stores unavailable")).mockResolvedValueOnce([]); render(<StoreComplianceMonthly />); await screen.findByText(/Scoped Stores unavailable/); expect(service.listStores).toHaveBeenCalledTimes(1); expect(service.listStores).toHaveBeenCalledWith(false); fireEvent.click(screen.getByText("Retry Stores")); expect(await screen.findByText("No stores assigned or available.")).toBeInTheDocument(); expect(screen.getByText("Create Monthly Record")).toBeDisabled();
});
test("permission denied and loading do not fetch monthly APIs", () => {
  localStorage.setItem("user_role", "employee"); mockPermissions = { loading: true, hasPermission: () => false }; const { rerender } = render(<StoreComplianceMonthly />); expect(screen.getByText("Loading permissions…")).toBeInTheDocument(); expect(service.listMonthlyCompliance).not.toHaveBeenCalled(); mockPermissions = { loading: false, hasPermission: () => false }; rerender(<StoreComplianceMonthly />); expect(screen.getByRole("alert")).toHaveTextContent("do not have permission"); expect(service.listStores).not.toHaveBeenCalled();
});
test("Employee without create/upload/export gets no corresponding controls", async () => {
  localStorage.setItem("user_role", "employee"); mockPermissions.hasPermission = (key) => key === "store_compliance.view"; render(<StoreComplianceMonthly />); await openDetail(); expect(screen.queryByText("Create Monthly Record")).toBeNull(); expect(screen.queryByText("Export Excel")).toBeNull(); expect(screen.queryByText("Upload Monthly Card")).toBeNull(); expect(screen.queryByText("Upload Supporting Document")).toBeNull();
});
test("create duplicate is surfaced; success opens detail and separately offers card upload", async () => {
  service.createMonthlyCompliance.mockRejectedValueOnce({ response: { data: { detail: "Store period already exists" } } }).mockResolvedValueOnce(row); render(<StoreComplianceMonthly />); await ready(); expect(service.listStores).toHaveBeenCalledWith(true); fireEvent.click(screen.getByText("Create Monthly Record")); change("Store *", "S1"); fireEvent.click(screen.getByText("Create Record")); expect(await screen.findByRole("alert")).toHaveTextContent("already exists"); fireEvent.click(screen.getByText("Create Record")); await screen.findByText(/Monthly record created/); await screen.findByText("Upload Monthly Card"); expect(service.uploadMonthlyCard).not.toHaveBeenCalled(); expect(service.createMonthlyCompliance).toHaveBeenCalledTimes(2);
});
test("card mutation refreshes detail, summary and list", async () => {
  render(<StoreComplianceMonthly />); await openDetail(); fireEvent.click(screen.getByText("Upload Monthly Card")); fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["pdf"], "card.pdf", { type: "application/pdf" })] } }); fireEvent.click(screen.getByText("Save Card")); await screen.findByText("Monthly card saved."); expect(service.uploadMonthlyCard).toHaveBeenCalledWith(9, expect.any(File), "", expect.any(Function)); await waitFor(() => expect(service.getMonthlyDetail).toHaveBeenCalledTimes(2)); expect(service.getMonthlySummary).toHaveBeenCalledTimes(2); expect(service.listMonthlyCompliance).toHaveBeenCalledTimes(2);
});
test("payment proof failure/retry retains exact payment and never resubmits payment", async () => {
  service.uploadAttachment.mockRejectedValueOnce(new Error("Proof unavailable")).mockResolvedValueOnce({ id: 44 }); render(<StoreComplianceMonthly />); await openDetail(); fireEvent.click(screen.getByText("Record Payment")); change("Payment Amount *", "4000"); fireEvent.click(screen.getByText("Save Payment")); await screen.findByRole("dialog", { name: "Attach Payment Proof" }); fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["proof"], "proof.pdf", { type: "application/pdf" })] } }); fireEvent.click(screen.getByText("Upload Attachment")); expect(await screen.findByRole("alert")).toHaveTextContent("Payment recorded successfully, but proof upload failed."); fireEvent.click(screen.getByText("Upload Attachment")); await screen.findByText("Attachment uploaded."); expect(service.recordPayment).toHaveBeenCalledTimes(1); expect(service.uploadAttachment).toHaveBeenCalledTimes(2); expect(service.uploadAttachment).toHaveBeenLastCalledWith(9, { file: expect.any(File), attachment_type: "PAYMENT_PROOF", payment_id: 27, invoice_id: 11 });
});
test.each([{ has_invoice: false, invoice: null, payment_status: "NO_INVOICE", outstanding_amount: 0 }, { payment_status: "PAID", outstanding_amount: 0 }])("no payment action for no invoice or fully paid record", async (override) => {
  service.getMonthlyDetail.mockResolvedValue({ ...detail, ...override }); render(<StoreComplianceMonthly />); await openDetail(); expect(screen.queryByText("Record Payment")).toBeNull();
});
test("export filename honors Content-Disposition and safe fallback", () => {
  expect(exportFilename('attachment; filename="custom.xlsx"')).toBe("custom.xlsx"); expect(exportFilename("attachment; filename*=UTF-8''monthly%20report.xlsx")).toBe("monthly report.xlsx"); expect(exportFilename(null)).toMatch(/^store_compliance_monthly_\d{8}\.xlsx$/);
});
test("SuperAdmin financial controls work even when permission hook grants nothing", async () => {
  mockPermissions = { loading: false, hasPermission: () => false }; render(<StoreComplianceMonthly />); await openDetail(); expect(screen.getByText("Edit Invoice")).toBeInTheDocument(); expect(screen.getByText("Record Payment")).toBeInTheDocument(); expect(service.listStores).toHaveBeenCalledWith(true);
});
test("paid invoice page mutation sends remarks-only PATCH and refreshes detail", async () => {
  service.updateInvoice.mockResolvedValue(detail.invoice); render(<StoreComplianceMonthly />); await openDetail(); fireEvent.click(screen.getByText("Edit Invoice")); change("Remarks", "Paid invoice note"); fireEvent.click(screen.getByText("Save Invoice")); await screen.findByText("Invoice saved."); expect(service.updateInvoice).toHaveBeenCalledWith(9, { remarks: "Paid invoice note" }); expect(service.createInvoice).not.toHaveBeenCalled(); await waitFor(() => expect(service.getMonthlyDetail).toHaveBeenCalledTimes(2));
});
test("detail error retry recovers and ledger proof upload links the selected payment", async () => {
  service.getMonthlyDetail.mockRejectedValueOnce(new Error("Detail unavailable")).mockResolvedValue({ ...detail, payments: [{ id: 55, invoice_id: 11, payment_number: "CPAY-55", amount: "4000", payment_date: "2026-10-15T10:00:00Z", payment_mode: "CASH", paid_by_name: "Admin" }] });
  render(<StoreComplianceMonthly />); await ready(); fireEvent.click(screen.getByRole("button", { name: "SC-9" })); await screen.findByText("Detail unavailable"); fireEvent.click(screen.getByText("Retry detail")); await screen.findByText("CPAY-55"); fireEvent.click(screen.getByText("Attach Payment Proof")); fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["pdf"], "cash.pdf", { type: "application/pdf" })] } }); fireEvent.click(screen.getByText("Upload Attachment")); await screen.findByText("Attachment uploaded."); expect(service.uploadAttachment).toHaveBeenCalledWith(9, expect.objectContaining({ payment_id: 55, invoice_id: 11 })); expect(service.recordPayment).not.toHaveBeenCalled();
});
test("void request retains audit entry after refresh", async () => {
  const attachment = { id: 77, file_name: "wrong.pdf", file_url: "https://files.example.test/wrong.pdf", attachment_type: "OTHER", uploaded_by_name: "Admin", created_at: "2026-10-15T10:00:00Z" };
  service.getMonthlyDetail.mockResolvedValueOnce({ ...detail, attachments: [attachment] }).mockResolvedValue({ ...detail, attachments: [{ ...attachment, voided_at: "2026-10-15T11:00:00Z", void_reason: "Wrong receipt" }] }); service.voidAttachment.mockResolvedValue({ ...attachment, void_reason: "Wrong receipt" });
  render(<StoreComplianceMonthly />); await openDetail(); fireEvent.click(screen.getByText("Void")); change("Void reason *", "Wrong receipt"); fireEvent.click(screen.getByRole("button", { name: "Void Attachment" })); await screen.findByText("Voided"); expect(service.voidAttachment).toHaveBeenCalledWith(9, 77, "Wrong receipt"); expect(screen.getByText("wrong.pdf")).toBeInTheDocument(); expect(screen.queryByText("Delete")).toBeNull();
});
test("export passes current filters and downloads returned filename", async () => {
  service.exportMonthlyCompliance.mockResolvedValue({ data: new Blob(["excel"]), headers: { "content-disposition": 'attachment; filename="monthly.xlsx"' } });
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<StoreComplianceMonthly />); await ready(); change("Has Invoice", "false"); change("Channel", "BLINKIT"); fireEvent.click(screen.getByText("Export Excel"));
  await waitFor(() => expect(click).toHaveBeenCalled()); expect(service.exportMonthlyCompliance).toHaveBeenCalledWith(expect.objectContaining({ has_invoice: false, channel: "BLINKIT" })); expect(click.mock.instances[0].download).toBe("monthly.xlsx"); click.mockRestore();
});
