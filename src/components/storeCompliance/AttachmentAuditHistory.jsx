import React from "react";
import { timestamp } from "./shared";
const GROUPS = { CARD: "Monthly Card History", INVOICE: "Invoice Documents", PAYMENT_PROOF: "Payment Proofs", OTHER: "Other Supporting Documents" };
export default function AttachmentAuditHistory({ record, canVoid, onPreview, onVoid }) {
  return <section className="sc-panel"><h3>Attachments / Audit History</h3>{Object.entries(GROUPS).map(([type, title]) => <section key={type} className="sc-audit-group"><h4>{title}</h4>
    {!(record.attachments || []).some((item) => item.attachment_type === type) && <p>No documents.</p>}
    {(record.attachments || []).filter((item) => item.attachment_type === type).map((item) => {
      const current = !item.voided_at && ((type === "CARD" && item.file_url === record.card_file_url) || (type === "INVOICE" && item.file_url === record.invoice?.file_url));
      return <article className="sc-attachment" key={item.id}><div><strong>{item.file_name}</strong> <span className="sc-status">{item.voided_at ? "Voided" : current ? "Current" : "Active"}</span><small>{item.attachment_type} · {item.uploaded_by_name || item.uploaded_by_id} · {timestamp(item.created_at)}</small>{item.payment_id && <small>Payment ID: {item.payment_id}</small>}{item.voided_at && <p>Voided {timestamp(item.voided_at)} by {item.voided_by_name || item.voided_by_id || "—"}: {item.void_reason}</p>}</div><div className="sc-actions"><button onClick={() => onPreview(item)}>Preview</button>{canVoid && !item.voided_at && <button onClick={() => onVoid(item)}>Void</button>}</div></article>;
    })}
  </section>)}</section>;
}
