import React, { useEffect, useRef } from "react";

export default function Modal({ title, onClose, busy = false, children, wide = false }) {
  const root = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    const previous = document.activeElement;
    const node = root.current;
    const focusable = () => [...node.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')];
    (focusable()[0] || node).focus();
    const keydown = (event) => {
      if (event.key === "Escape" && !busy) { event.stopPropagation(); closeRef.current(); }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0]; const last = items[items.length - 1];
        if (!items.length) { event.preventDefault(); node.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    node.addEventListener("keydown", keydown);
    return () => { node.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [busy]);
  return <div className="sc-overlay"><section ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`sc-modal ${wide ? "sc-drawer" : ""}`}>
    <header><h2>{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label={`Close ${title}`}>Close</button></header>
    {children}
  </section></div>;
}
