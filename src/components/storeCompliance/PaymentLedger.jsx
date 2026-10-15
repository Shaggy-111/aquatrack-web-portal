import React from "react";
import { money, timestamp } from "./shared";
import { Status } from "./MonthlyComplianceTable";
export default function PaymentLedger({ record, canUploadProof, onProof, onPreview }) {
  return <section className="sc-panel"><h3>Payment Ledger</h3><dl className="sc-totals"><div><dt>Invoice Amount</dt><dd>{record.has_invoice ? money(record.invoice_amount) : "No invoice"}</dd></div><div><dt>Total Paid</dt><dd>{money(record.total_paid)}</dd></div><div><dt>Outstanding</dt><dd>{money(record.outstanding_amount)}</dd></div></dl><Status value={record.payment_status} />
    {!(record.payments || []).length && <p>No payments recorded.</p>}
    {(record.payments || []).map((payment) => {
      const proofs = (record.attachments || []).filter((item) => item.attachment_type === "PAYMENT_PROOF" && item.payment_id === payment.id);
      return <article className="sc-payment" key={payment.id}><div className="sc-section-header"><h4>{payment.payment_number || `Payment #${payment.id}`}</h4><strong>{money(payment.amount)}</strong></div><dl className="sc-facts"><div><dt>Date</dt><dd>{timestamp(payment.payment_date)}</dd></div><div><dt>Mode</dt><dd>{payment.payment_mode}</dd></div><div><dt>Transaction Reference</dt><dd>{payment.transaction_reference || "—"}</dd></div><div><dt>Paid By</dt><dd>{payment.paid_by_name || payment.paid_by_id}</dd></div><div><dt>Remarks</dt><dd>{payment.remarks || "—"}</dd></div></dl><p>Proofs: {proofs.length}</p><div className="sc-actions">{proofs.map((proof) => <button key={proof.id} onClick={() => onPreview(proof)}>{proof.file_name}{proof.voided_at ? " (Voided)" : ""}</button>)}{canUploadProof && <button onClick={() => onProof(payment)}>Attach Payment Proof</button>}</div></article>;
    })}
  </section>;
}
