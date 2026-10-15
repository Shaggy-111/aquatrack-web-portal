import React, { lazy, Suspense, useState } from "react";
import StoreComplianceMonthly from "./StoreComplianceMonthly";
import "./StoreComplianceMonthly.css";
const Legacy = lazy(() => import("../StoreComplianceDashboard"));

export default function StoreCompliance() {
  const [tab, setTab] = useState("monthly");
  return <div className="sc-workspace">
    <nav className="sc-tabs" aria-label="Store Compliance views">
      <button aria-pressed={tab === "monthly"} onClick={() => setTab("monthly")}>Monthly Compliance</button>
      <button aria-pressed={tab === "legacy"} onClick={() => setTab("legacy")}>Legacy Weekly History</button>
    </nav>
    {tab === "monthly" ? <StoreComplianceMonthly /> : <section><h1 className="sc-legacy-title">Legacy Weekly History</h1><p className="sc-legacy-title">Historical weekly documents and legacy operations.</p><Suspense fallback={<p>Loading legacy history…</p>}><Legacy /></Suspense></section>}
  </div>;
}
