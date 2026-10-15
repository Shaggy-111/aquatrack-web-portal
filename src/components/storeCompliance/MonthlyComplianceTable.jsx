import React from "react";
import { label, money, period } from "./shared";
export function Status({ value }) { return <span className={`sc-status sc-${String(value).toLowerCase()}`}>{label(value)}</span>; }
export default function MonthlyComplianceTable({ items, onView }) {
  if (!items.length) return <div className="sc-panel sc-empty">No monthly records match these filters.</div>;
  return <>
    <div className="sc-desktop-table sc-panel"><table><thead><tr>{["Compliance No", "Month", "Store", "Region / Channel", "Card Status", "Invoice No", "Invoice Amount", "Paid", "Outstanding", "Payment Status", "Actions"].map((title) => <th key={title}>{title}</th>)}</tr></thead>
      <tbody>{items.map((row) => <tr key={row.id}>
        <td><button className="sc-link" onClick={() => onView(row.id)}>{row.compliance_number}</button></td><td>{period(row)}</td><td><strong>{row.store_name}</strong><small>{row.store_id}</small></td><td>{row.store_region || "—"}<small>{row.store_channel || "—"}</small></td><td><Status value={row.card_status} /></td><td>{row.invoice_number || "No invoice"}</td><td className="sc-money">{row.has_invoice ? money(row.invoice_amount) : "—"}</td><td className="sc-money">{money(row.total_paid)}</td><td className="sc-money">{money(row.outstanding_amount)}</td><td><Status value={row.payment_status} /></td><td><button onClick={() => onView(row.id)}>View</button></td>
      </tr>)}</tbody></table></div>
    <div className="sc-mobile-cards">{items.map((row) => <article className="sc-panel" key={row.id}><h3>{row.store_name}</h3><p>{period(row)} · {row.compliance_number}</p><div className="sc-actions"><Status value={row.card_status} /><Status value={row.payment_status} /></div><p>Outstanding <strong>{money(row.outstanding_amount)}</strong></p><button onClick={() => onView(row.id)}>View</button></article>)}</div>
  </>;
}
