import React, { useState, useRef } from "react";
import { uploadPDF, sendToClaude } from "../api";

export default function Upload({ setReport, setLoading }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const inputRef = useRef();

  const process = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setReport("");
    setStatus("Reading document…");
    try {
      const pdf = await uploadPDF(file);
      setStatus("Analyzing with AI…");
      const claude = await sendToClaude(pdf.data.text);
      setReport(claude.data.result);
      setStatus("");
    } catch (err) {
      setStatus("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const onFile = (e) => process(e.target.files[0]);
  const onDrop = (e) => { e.preventDefault(); setDragging(false); process(e.dataTransfer.files[0]); };

  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf" onChange={onFile} style={{ display: "none" }} />
      <div className="dropzone-icon">
        {status ? <span className="spinner" /> : "📄"}
      </div>
      <div className="dropzone-text">
        {status ? (
          <><strong>{status}</strong></>
        ) : fileName ? (
          <><strong>{fileName}</strong><br /><span>Click to upload a different file</span></>
        ) : (
          <><strong>Drop your permit PDF here</strong><br /><span>or click to browse files</span></>
        )}
      </div>
      {!status && <div className="dropzone-hint">Supports PDF files up to 10MB</div>}
    </div>
  );
}
