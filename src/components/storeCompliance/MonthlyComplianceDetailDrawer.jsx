import React from "react";
import Modal from "./Modal";
import PaymentLedger from "./PaymentLedger";
import AttachmentAuditHistory from "./AttachmentAuditHistory";
import { Status } from "./MonthlyComplianceTable";
import { money, period, timestamp } from "./shared";
export default function MonthlyComplianceDetailDrawer({ record, loading, error, onRetry, onClose, caps, onCard, onInvoice, onPayment, onAttachment, onProof, onPreview, onVoid }) {
  return <Modal title={record?.compliance_number || "Monthly Compliance Detail"} wide onClose={onClose}><div className="sc-form-body">
    {loading ? <p role="status">Loading detail…</p> : error ? <div role="alert">{error}<button onClick={onRetry}>Retry detail</button></div> : record && <>
      <div className="sc-section-header"><div><h3>{record.store_name}</h3><p>{period(record)}</p></div><div className="sc-actions"><Status value={record.card_status} /><Status value={record.payment_status} /></div></div>
      <div className="sc-two"><section className="sc-panel"><h3>Store Snapshot</h3><dl className="sc-facts">{[["Store ID", record.store_id], ["Name", record.store_name], ["Region", record.store_region], ["Channel", record.store_channel], ["Entity", record.store_entity], ["Delivery Manager", record.delivery_manager_name]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value || "—"}</dd></div>)}</dl></section>
        <section className="sc-panel"><h3>Monthly Card</h3>{record.card_file_url ? <><button onClick={() => onPreview({ file_url: record.card_file_url, file_name: record.card_file_name })}>{record.card_file_name || "Preview card"}</button><p>{record.card_uploaded_by_name || record.card_uploaded_by_id} · {timestamp(record.card_uploaded_at)}</p></> : <p>Pending card upload.</p>}<p>{record.card_remarks || "No card remarks."}</p>{caps.upload && <button onClick={onCard}>{record.card_file_url ? "Replace Monthly Card" : "Upload Monthly Card"}</button>}</section>
      </div>
      <section className="sc-panel"><div className="sc-section-header"><h3>Invoice</h3>{caps.invoice && <button onClick={onInvoice}>{record.invoice ? "Edit Invoice" : "Add Invoice"}</button>}</div>{record.invoice ? <><dl className="sc-facts"><div><dt>Invoice No</dt><dd>{record.invoice.invoice_number}</dd></div><div><dt>Date</dt><dd>{record.invoice.invoice_date}</dd></div><div><dt>Amount</dt><dd>{money(record.invoice.invoice_amount)}</dd></div><div><dt>Remarks</dt><dd>{record.invoice.remarks || "—"}</dd></div></dl>{record.invoice.file_url && <button onClick={() => onPreview(record.invoice)}>{record.invoice.file_name || "Preview invoice"}</button>}{Number(record.total_paid) > 0 && <p>Invoice identity and file are locked after payment. Remarks remain editable.</p>}</> : <p>No invoice added.</p>}</section>
      <PaymentLedger record={record} canUploadProof={caps.superAdmin} onProof={onProof} onPreview={onPreview} />
      <AttachmentAuditHistory record={record} canVoid={caps.void} onPreview={onPreview} onVoid={onVoid} />
    </>}
  </div>{record && !loading && !error && <footer>{caps.upload && <button onClick={onAttachment}>Upload Supporting Document</button>}{caps.payment && record.has_invoice && record.payment_status !== "PAID" && Number(record.outstanding_amount) > 0 && <button className="sc-primary" onClick={onPayment}>Record Payment</button>}</footer>}</Modal>;
}
