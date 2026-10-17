import React from "react";

export default function ReimbursementStoreSelector({ controller, id, title, value, onChange, open, onOpen, onClose }) {
  const { filters, metadata } = controller;
  return <div className="reimb-store-selector">
    <label htmlFor={id} className="reimb-field-label">{title}</label>
    <div className="reimb-store-selection">
      <button id={id} type="button" className="reimb-input" aria-expanded={open} aria-controls={`${id}-panel`} onClick={open ? onClose : onOpen}>
        {value ? `${value.store_name} (${value.id})` : "Choose Store"}
      </button>
      {value && <button type="button" className="reimb-btn-secondary" aria-label={`Clear ${title}`} onClick={() => onChange(null)}>Clear</button>}
    </div>
    {open && <section id={`${id}-panel`} className="reimb-store-panel" aria-label={`${title} selector`}>
      <div className="reimb-store-filters">
        {[["region", "Region", "regions"], ["channel", "Channel", "channels"], ["state", "State", "states"], ["city", "City", "cities"]].map(([key, text, options]) => <label key={key} className="reimb-field-label">{text}
          <select className="reimb-input" aria-label={`${title} ${text}`} value={filters[key]} disabled={controller.metadataLoading} onChange={(event) => controller.changeFilter(key, event.target.value)}>
            <option value="">All</option>{(metadata[options] || []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>)}
      </div>
      <label className="reimb-field-label">Search Store<input type="search" className="reimb-input" aria-label={`${title} Search Store`} placeholder="Store name or ID" value={controller.search} onChange={(event) => controller.changeSearch(event.target.value)} /></label>
      {controller.metadataLoading && <p role="status">Loading Store filters…</p>}
      {controller.metadataError && <div role="alert">{controller.metadataError} <button type="button" onClick={controller.retryMetadata}>Retry Store filters</button></div>}
      {controller.loading && <p role="status">Loading Stores…</p>}
      {controller.error && <div role="alert">{controller.error} <button type="button" onClick={controller.retryResults}>Retry Stores</button></div>}
      {!controller.loading && !controller.error && !controller.items.length && <p>No stores found</p>}
      <ul className="reimb-store-results" aria-label={`${title} results`}>
        {controller.items.map((store) => <li key={store.id}><button type="button" aria-label={`${store.store_name} (${store.id})`} disabled={controller.loading} aria-pressed={String(value?.id) === String(store.id)} onClick={() => { onChange(store); onClose(); }}>
          <strong>{store.store_name} ({store.id})</strong><span>{[store.region, store.channel, store.state, store.city].filter(Boolean).join(" · ")}</span>
        </button></li>)}
      </ul>
      <div className="reimb-store-actions">
        {controller.hasMore && <button type="button" className="reimb-btn-secondary" disabled={controller.loading || Boolean(controller.error)} onClick={controller.loadMore}>Load More Stores</button>}
        <button type="button" className="reimb-btn-secondary" onClick={controller.clear}>Clear Store filters</button>
        <button type="button" className="reimb-btn-secondary" onClick={onClose}>Close Store selector</button>
      </div>
    </section>}
  </div>;
}
