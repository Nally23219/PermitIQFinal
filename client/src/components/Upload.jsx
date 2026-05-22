import React from "react";
import { uploadPDF, sendToClaude } from "../api";

export default function Upload({ setReport }) {
  const handle = async (e) => {
    const file = e.target.files[0];
    const pdf = await uploadPDF(file);
    const claude = await sendToClaude(pdf.data.text);
    setReport(claude.data.result);
  };

  return <input type="file" onChange={handle} />;
}
