import React, { useEffect, useState } from "react";
import api from "../../services/apiClient";
import { API_BASE_URL } from "../../config";
import Modal from "./Modal";

export const resolveDocument = (fileUrl) => {
  const base = new URL(API_BASE_URL || window.location.origin, window.location.origin);
  // Match existing API-relative storage paths, including deployments with an API path prefix.
  const url = new URL(fileUrl, `${base.href.replace(/\/$/, "")}/`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported document URL.");
  return { url: url.href, protectedApi: url.origin === base.origin };
};
export default function AttachmentViewer({ file, onClose }) {
  const [source, setSource] = useState(""); const [error, setError] = useState(""); const [mime, setMime] = useState("");
  useEffect(() => {
    let active = true; let blobUrl;
    setSource(""); setError(""); setMime("");
    const load = async () => {
      try {
        const resolved = resolveDocument(file.file_url);
        if (!resolved.protectedApi) { if (active) setSource(resolved.url); return; }
        const response = await api.get(resolved.url, { responseType: "blob" });
        if (!active) return;
        setMime(response.data.type || ""); blobUrl = URL.createObjectURL(response.data); setSource(blobUrl);
      } catch (failure) { if (active) setError("Unable to preview this file. Check your access and try again."); }
    };
    load(); return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [file]);
  const name = file.file_name || "Document";
  const image = mime.startsWith("image/") || /\.(jpe?g|png|webp)(\?|$)/i.test(file.file_url) || /\.(jpe?g|png|webp)$/i.test(name);
  return <Modal title={name} onClose={onClose} wide><div className="sc-form-body">
    {error ? <p role="alert">{error}</p> : !source ? <p role="status">Loading preview…</p> : <>
      <a href={source} target="_blank" rel="noopener noreferrer">Open / download document</a>
      {image ? <img className="sc-document-image" src={source} alt={name} /> : <iframe title={name} src={source} className="sc-document-pdf" referrerPolicy="no-referrer" />}
      <p>If preview is unavailable, use Open / download document.</p>
    </>}
  </div></Modal>;
}
