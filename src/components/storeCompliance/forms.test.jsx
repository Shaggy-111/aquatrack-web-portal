import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateMonthlyRecordModal from "./CreateMonthlyRecordModal";
import MonthlyCardModal from "./MonthlyCardModal";
import InvoiceModal from "./InvoiceModal";
import PaymentModal from "./PaymentModal";
import AttachmentUploadModal from "./AttachmentUploadModal";
import AttachmentAuditHistory from "./AttachmentAuditHistory";
import VoidAttachmentModal from "./VoidAttachmentModal";
import { capabilities, fileError, PAYMENT_MODES } from "./shared";

const file = () => new File(["image"], "proof.webp", { type: "image/webp" });
const record = { id: 9, invoice_amount: "10000", total_paid: "4000", outstanding_amount: "6000", invoice: { id: 11, invoice_number: "INV-1", invoice_date: "2026-10-15", invoice_amount: "10000", remarks: "old" } };
let submit;
const props = () => ({ onClose: jest.fn(), onSubmit: submit, busy: false, error: "" });
beforeEach(() => { submit = jest.fn(); URL.createObjectURL = jest.fn(() => "blob:preview"); URL.revokeObjectURL = jest.fn(); });
const change = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const upload = () => fireEvent.change(screen.getByLabelText("Document"), { target: { files: [file()] } });
test("create exact scoped payload, duplicate backend error and no weekly controls", () => {
  render(<CreateMonthlyRecordModal {...props()} stores={[{ id: "S1", store_name: "Assigned Store" }]} error="Monthly compliance already exists" />);
  change("Store *", "S1"); change("Year *", "2026"); change("Month *", "10"); change("Card Remarks", " October ");
  fireEvent.click(screen.getByText("Create Record")); expect(submit).toHaveBeenCalledWith({ store_id: "S1", year: 2026, month: 10, card_remarks: "October" });
  expect(screen.getByRole("alert")).toHaveTextContent("already exists"); expect(screen.queryByText(/Week/)).toBeNull();
});
test("card replacement warning and WEBP upload use file/remarks", () => {
  render(<MonthlyCardModal {...props()} record={{ card_file_url: "old.pdf" }} />); expect(screen.getByText(/previous version in audit history/)).toBeInTheDocument(); upload(); change("Remarks", "New card"); fireEvent.click(screen.getByText("Save Card")); expect(submit).toHaveBeenCalledWith(expect.objectContaining({ name: "proof.webp" }), "New card");
});
test("file validation accepts 10MB exactly, rejects larger/empty/unsupported files", () => {
  expect(fileError({ name: "card.webp", size: 10 * 1024 * 1024 })).toBe(""); expect(fileError({ name: "card.webp", size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/); expect(fileError({ name: "card.exe", size: 10 })).toMatch(/Supported/); expect(fileError({ name: "empty.pdf", size: 0 })).toMatch(/empty/);
});
test("unsupported picker file prevents card submit", () => {
  render(<MonthlyCardModal {...props()} record={{}} />); fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["exe"], "bad.exe")] } }); fireEvent.click(screen.getByText("Save Card")); expect(submit).not.toHaveBeenCalled();
});
test("invoice creation requires file and sends exact fields", () => {
  render(<InvoiceModal {...props()} record={{ total_paid: 0 }} />); change("Invoice Number *", "INV-2"); change("Invoice Date *", "2026-10-15"); change("Invoice Amount *", "10000"); fireEvent.click(screen.getByText("Save Invoice")); expect(submit).not.toHaveBeenCalled(); expect(screen.getByRole("alert")).toHaveTextContent("Choose a file"); upload(); fireEvent.click(screen.getByText("Save Invoice")); expect(submit).toHaveBeenCalledWith({ invoice_number: "INV-2", invoice_date: "2026-10-15", invoice_amount: "10000", file: expect.any(File), remarks: "" }, false);
});
test("unpaid invoice allows identity and optional file replacement", () => {
  render(<InvoiceModal {...props()} record={{ ...record, total_paid: 0 }} />); change("Invoice Number *", "INV-3"); upload(); fireEvent.click(screen.getByText("Save Invoice")); expect(submit).toHaveBeenCalledWith(expect.objectContaining({ invoice_number: "INV-3", file: expect.any(File) }), true);
});
test("paid invoice omits all immutable fields rather than submitting disabled values", () => {
  render(<InvoiceModal {...props()} record={record} />); expect(screen.queryByLabelText("Invoice Number *")).toBeNull(); expect(screen.queryByLabelText("Document")).toBeNull(); change("Remarks", "Updated note"); fireEvent.click(screen.getByText("Save Invoice")); expect(submit).toHaveBeenCalledWith({ remarks: "Updated note" }, true);
});
test.each(["0", "-1", "6000.01", "1.001"])("payment blocks invalid amount %s", (amount) => {
  render(<PaymentModal {...props()} record={record} />); change("Payment Amount *", amount); fireEvent.submit(screen.getByText("Save Payment").closest("form")); expect(submit).not.toHaveBeenCalled(); expect(screen.getByRole("alert")).toBeInTheDocument();
});
test.each(["4000", "6000"])("partial/full payment %s sends exact payload and six modes", (amount) => {
  render(<PaymentModal {...props()} record={record} />); expect(within(screen.getByLabelText("Payment Mode *")).getAllByRole("option").map((item) => item.value)).toEqual(PAYMENT_MODES); change("Payment Amount *", amount); change("Payment Date *", "2026-10-15T14:30"); change("Payment Mode *", "NEFT"); change("Transaction Reference", "REF-1"); fireEvent.click(screen.getByText("Save Payment")); expect(submit).toHaveBeenCalledWith({ amount, payment_date: new Date("2026-10-15T14:30").toISOString(), payment_mode: "NEFT", transaction_reference: "REF-1", remarks: null });
});
test("pay remaining fills exact outstanding", () => {
  render(<PaymentModal {...props()} record={record} />); fireEvent.click(screen.getByText(/Pay remaining/)); expect(screen.getByLabelText("Payment Amount *")).toHaveValue(6000);
});
test("proof uses exact payment ID and invoice ID", () => {
  render(<AttachmentUploadModal {...props()} record={record} payment={{ id: 27, invoice_id: 11 }} superAdmin />); upload(); fireEvent.click(screen.getByText("Upload Attachment")); expect(submit).toHaveBeenCalledWith({ file: expect.any(File), attachment_type: "PAYMENT_PROOF", payment_id: 27, invoice_id: 11 });
});
test("Employee supporting uploader offers OTHER only", () => {
  render(<AttachmentUploadModal {...props()} record={record} superAdmin={false} />); expect(within(screen.getByLabelText("Attachment Type")).getAllByRole("option").map((item) => item.value)).toEqual(["OTHER"]);
});
test("voided proof remains visible with reason, Employee has no Void", () => {
  render(<AttachmentAuditHistory record={{ attachments: [{ id: 1, attachment_type: "PAYMENT_PROOF", file_name: "proof.pdf", voided_at: "2026-10-15T10:00:00Z", void_reason: "Wrong proof", payment_id: 27 }] }} canVoid={false} />); expect(screen.getByText("proof.pdf")).toBeInTheDocument(); expect(screen.getByText("Voided")).toBeInTheDocument(); expect(screen.getByText(/Wrong proof/)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Void" })).toBeNull();
});
test("void requires trimmed reason of at least three characters", () => {
  render(<VoidAttachmentModal {...props()} attachment={{ file_name: "wrong.pdf" }} />); change("Void reason *", "  "); expect(screen.getByRole("button", { name: "Void Attachment" })).toBeDisabled(); change("Void reason *", " Wrong file "); fireEvent.click(screen.getByRole("button", { name: "Void Attachment" })); expect(submit).toHaveBeenCalledWith("Wrong file");
});
test("SuperAdmin bypass is local; Employee financial actions stay denied even with wildcard", () => {
  expect(capabilities("Super_Admin", () => false)).toEqual(expect.objectContaining({ view: true, invoice: true, payment: true, void: true, export: true }));
  expect(capabilities("employee", () => true)).toEqual(expect.objectContaining({ view: true, create: true, upload: true, export: true, invoice: false, payment: false, void: false }));
  expect(capabilities("employee", () => false)).toEqual(expect.objectContaining({ view: false, create: false, upload: false, export: false }));
  expect(capabilities("channeladmin", () => true).view).toBe(false);
});
