import React, { useState } from "react";
import Modal from "./Modal";
import FilePicker from "./FilePicker";
import { fileError } from "./shared";
export default function MonthlyCardModal({ record, onClose, onSubmit, busy, error, progress }) {
  const [file, setFile] = useState(null); const [remarks, setRemarks] = useState(record.card_remarks || "");
  const [validation, setValidation] = useState("");
  return <Modal title={record.card_file_url ? "Replace Monthly Card" : "Upload Monthly Card"} busy={busy} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const message = fileError(file); setValidation(message); if (!message) onSubmit(file, remarks); }}>
    <div className="sc-form-body">{record.card_file_url && <p>Replacing this card will keep the previous version in audit history.</p>}<FilePicker file={file} onChange={setFile} /><label>Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>{busy && <progress max="100" value={progress || 0} aria-label="Upload progress" />}{(error || validation) && <p role="alert">{error || validation}</p>}</div>
    <footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="sc-primary" disabled={busy}>{busy ? "Uploading…" : "Save Card"}</button></footer>
  </form></Modal>;
}
