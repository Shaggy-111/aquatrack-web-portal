import React, { useState } from "react";
import Modal from "./Modal";
import FilePicker from "./FilePicker";
import { currencyValid, fileError, money } from "./shared";
export default function InvoiceModal({ record, onClose, onSubmit, busy, error }) {
  const invoice = record.invoice;
  const locked = Number(record.total_paid) > 0;
  const [number, setNumber] = useState(invoice?.invoice_number || ""); const [date, setDate] = useState(invoice?.invoice_date || "");
  const [amount, setAmount] = useState(invoice?.invoice_amount || ""); const [remarks, setRemarks] = useState(invoice?.remarks || "");
  const [file, setFile] = useState(null); const [validation, setValidation] = useState("");
  const submit = (event) => {
    event.preventDefault();
    const message = !locked && ((!number.trim() || !date || !currencyValid(amount)) ? "Enter invoice number, date and a positive amount with up to two decimals." : (!invoice || file) ? fileError(file) : "");
    setValidation(message || ""); if (message) return;
    const payload = locked ? { remarks } : { invoice_number: number.trim(), invoice_date: date, invoice_amount: String(amount), remarks, ...(file ? { file } : {}) };
    onSubmit(payload, Boolean(invoice));
  };
  return <Modal title={invoice ? "Edit Invoice" : "Add Invoice"} busy={busy} onClose={onClose}><form onSubmit={submit}><div className="sc-form-body">
    {locked ? <><p>Payments have been recorded. Only remarks can be edited.</p><p>{number} · {date} · {money(amount)}</p></> : <>
      <label>Invoice Number *<input required maxLength="100" value={number} onChange={(event) => setNumber(event.target.value)} /></label><label>Invoice Date *<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Invoice Amount *<input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      {invoice && <p>Replacing the invoice file keeps the previous document in audit history.</p>}<FilePicker file={file} onChange={setFile} required={!invoice} />
    </>}
    <label>Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>{(error || validation) && <p role="alert">{error || validation}</p>}
  </div><footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="sc-primary" disabled={busy}>{busy ? "Saving…" : "Save Invoice"}</button></footer></form></Modal>;
}
