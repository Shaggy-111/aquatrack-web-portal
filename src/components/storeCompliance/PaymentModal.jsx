import React, { useState } from "react";
import Modal from "./Modal";
import { PAYMENT_MODES, currencyValid, localDateTime, money } from "./shared";
export default function PaymentModal({ record, onClose, onSubmit, busy, error }) {
  const [amount, setAmount] = useState(""); const [date, setDate] = useState(localDateTime); const [mode, setMode] = useState("UPI");
  const [reference, setReference] = useState(""); const [remarks, setRemarks] = useState(""); const [validation, setValidation] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (!currencyValid(amount) || Math.round(Number(amount) * 100) > Math.round(Number(record.outstanding_amount) * 100) || !date || !PAYMENT_MODES.includes(mode)) { setValidation("Enter a positive amount with up to two decimals, no greater than outstanding, and a valid date/mode."); return; }
    onSubmit({ amount: String(amount), payment_date: new Date(date).toISOString(), payment_mode: mode, transaction_reference: reference.trim() || null, remarks: remarks.trim() || null });
  };
  return <Modal title="Record Payment" busy={busy} onClose={onClose}><form onSubmit={submit}><div className="sc-form-body">
    <dl className="sc-totals"><div><dt>Invoice Amount</dt><dd>{money(record.invoice_amount)}</dd></div><div><dt>Already Paid</dt><dd>{money(record.total_paid)}</dd></div><div><dt>Outstanding</dt><dd>{money(record.outstanding_amount)}</dd></div></dl>
    <button type="button" onClick={() => setAmount(String(record.outstanding_amount))}>Pay remaining {money(record.outstanding_amount)}</button>
    <label>Payment Amount *<input required type="number" step="0.01" min="0.01" max={record.outstanding_amount} value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Payment Date *<input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></label>
    <label>Payment Mode *<select value={mode} onChange={(event) => setMode(event.target.value)}>{PAYMENT_MODES.map((value) => <option key={value}>{value}</option>)}</select></label><label>Transaction Reference<input maxLength="100" value={reference} onChange={(event) => setReference(event.target.value)} /></label><label>Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
    {(error || validation) && <p role="alert">{error || validation}</p>}
  </div><footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="sc-primary" disabled={busy}>{busy ? "Recording…" : "Save Payment"}</button></footer></form></Modal>;
}
