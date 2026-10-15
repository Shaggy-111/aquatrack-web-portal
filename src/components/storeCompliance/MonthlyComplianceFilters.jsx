import React from "react";
import { CARD_STATUSES, PAYMENT_STATUSES, label } from "./shared";

export const emptyFilters = () => ({ search: "", store_id: "", year: "", month: "", region: "", channel: "", entity: "", card_status: "", payment_status: "", has_invoice: "", outstanding_only: false });
export default function MonthlyComplianceFilters({ filters, onChange, stores, onClear }) {
  const count = Object.values(filters).filter((value) => value !== "" && value !== false).length;
  const select = (key, title, options) => <label>{title}<select value={filters[key]} onChange={(event) => onChange(key, event.target.value)}><option value="">All</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
  return <section className="sc-panel" aria-label="Monthly filters">
    <div className="sc-filter-primary">
      <label>Search<input type="search" value={filters.search} onChange={(event) => onChange("search", event.target.value)} placeholder="Compliance, Store or invoice" /></label>
      {select("store_id", "Store", stores.map((store) => [String(store.id ?? store.store_id), `${store.store_name} (${store.id ?? store.store_id})`]))}
      <label>Year<input type="number" min="2000" max="2100" placeholder="All" value={filters.year} onChange={(event) => onChange("year", event.target.value)} /></label>
      {select("month", "Month", Array.from({ length: 12 }, (_, index) => [index + 1, new Date(2000, index).toLocaleString("en-IN", { month: "long" })]))}
    </div>
    <details className="sc-advanced"><summary>More filters · {count} active</summary><div className="sc-filter-advanced">
      {[['region', 'Region'], ['channel', 'Channel'], ['entity', 'Entity']].map(([key, title]) => <label key={key}>{title}<input value={filters[key]} onChange={(event) => onChange(key, event.target.value)} placeholder={`All ${title.toLowerCase()}s`} /></label>)}
      {select("card_status", "Card Status", CARD_STATUSES.map((value) => [value, label(value)]))}
      {select("payment_status", "Payment Status", PAYMENT_STATUSES.map((value) => [value, label(value)]))}
      {select("has_invoice", "Has Invoice", [["true", "Yes"], ["false", "No"]])}
      <label className="sc-check"><input type="checkbox" checked={filters.outstanding_only} onChange={(event) => onChange("outstanding_only", event.target.checked)} />Outstanding Only</label>
    </div></details>
    <button type="button" onClick={onClear}>Clear All ({count})</button>
  </section>;
}
