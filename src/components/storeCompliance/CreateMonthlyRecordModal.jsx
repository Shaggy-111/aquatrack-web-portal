import React, { useState } from "react";
import Modal from "./Modal";
export default function CreateMonthlyRecordModal({ stores, onClose, onSubmit, busy, error }) {
  const [store, setStore] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [remarks, setRemarks] = useState("");
  return <Modal title="Create Monthly Record" onClose={onClose} busy={busy}><form onSubmit={(event) => { event.preventDefault(); onSubmit({ store_id: store, year: Number(year), month: Number(month), card_remarks: remarks.trim() || null }); }}>
    <div className="sc-form-body">{!stores.length && <p>No stores assigned or available.</p>}
      <label>Store *<select required value={store} onChange={(event) => setStore(event.target.value)}><option value="">Choose Store</option>{stores.map((item) => <option key={item.id ?? item.store_id} value={item.id ?? item.store_id}>{item.store_name} ({item.id ?? item.store_id})</option>)}</select></label>
      <div className="sc-two"><label>Year *<input type="number" required min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} /></label><label>Month *<select value={month} onChange={(event) => setMonth(event.target.value)}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{new Date(2000, index).toLocaleString("en-IN", { month: "long" })}</option>)}</select></label></div>
      <label>Card Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>{error && <p role="alert">{error}</p>}
    </div><footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="sc-primary" disabled={busy || !stores.length}>{busy ? "Creating…" : "Create Record"}</button></footer>
  </form></Modal>;
}
