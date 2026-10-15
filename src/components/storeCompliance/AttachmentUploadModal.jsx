import React, { useState } from "react";
import Modal from "./Modal";
import FilePicker from "./FilePicker";
import { fileError } from "./shared";
export default function AttachmentUploadModal({ record, payment, superAdmin, onClose, onSubmit, busy, error }) {
  const [file, setFile] = useState(null); const [type, setType] = useState(payment ? "PAYMENT_PROOF" : "OTHER"); const [validation, setValidation] = useState("");
  const submit = (event) => {
    event.preventDefault(); const message = fileError(file); setValidation(message); if (message) return;
    onSubmit({ file, attachment_type: payment ? "PAYMENT_PROOF" : type, ...(payment ? { payment_id: payment.id, invoice_id: payment.invoice_id } : type === "INVOICE" ? { invoice_id: record.invoice.id } : {}) });
  };
  return <Modal title={payment ? "Attach Payment Proof" : "Upload Supporting Document"} busy={busy} onClose={onClose}><form onSubmit={submit}><div className="sc-form-body">
    {payment ? <p>Payment {payment.payment_number || payment.id} has been recorded. Uploading proof will not record another payment.</p> : <label>Attachment Type<select value={type} onChange={(event) => setType(event.target.value)}><option>OTHER</option>{superAdmin && record.invoice && <option>INVOICE</option>}</select></label>}
    <FilePicker file={file} onChange={setFile} />{(error || validation) && <p role="alert">{error || validation}</p>}
  </div><footer><button type="button" disabled={busy} onClick={onClose}>Later</button><button className="sc-primary" disabled={busy}>{busy ? "Uploading…" : "Upload Attachment"}</button></footer></form></Modal>;
}
