import React, { useState } from "react";
import Modal from "./Modal";
export default function VoidAttachmentModal({ attachment, onClose, onSubmit, busy, error }) {
  const [reason, setReason] = useState("");
  return <Modal title="Void Attachment" busy={busy} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (reason.trim().length >= 3) onSubmit(reason.trim()); }}><div className="sc-form-body"><p>{attachment.file_name} remains visible in audit history.</p><label>Void reason *<textarea required minLength="3" value={reason} onChange={(event) => setReason(event.target.value)} /></label>{error && <p role="alert">{error}</p>}</div><footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button disabled={busy || reason.trim().length < 3}>{busy ? "Voiding…" : "Void Attachment"}</button></footer></form></Modal>;
}
