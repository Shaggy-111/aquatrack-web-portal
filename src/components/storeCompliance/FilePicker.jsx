import React, { useEffect, useState } from "react";
import { FILE_ACCEPT, fileError } from "./shared";

export default function FilePicker({ file, onChange, required = true }) {
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const choose = (candidate) => {
    if (!candidate) return;
    const message = fileError(candidate); setError(message); onChange(message ? null : candidate);
  };
  return <div className="sc-file" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}>
    <label>Document {required ? "*" : "(optional replacement)"}<input aria-label="Document" type="file" accept={FILE_ACCEPT} onChange={(event) => choose(event.target.files[0])} /></label>
    <p>Choose a file or drop it here · JPEG, PNG, WEBP, PDF · up to 10 MB</p>
    {error && <p role="alert">{error}</p>}
    {file && <p>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
    {preview && <img className="sc-file-preview" src={preview} alt="Selected document preview" />}
  </div>;
}
