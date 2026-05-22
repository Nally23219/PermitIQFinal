import React, { useState } from "react";
import Upload from "./components/Upload";
import Dashboard from "./components/Dashboard";
import Chatbot from "./components/Chatbot";

export default function App() {
  const [report, setReport] = useState("");

  return (
    <div style={{ padding: 20 }}>
      <h1>PermitIQ</h1>
      <Upload setReport={setReport} />
      <Dashboard report={report} />
      <Chatbot />
    </div>
  );
}
