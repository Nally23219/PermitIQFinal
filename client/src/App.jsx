import React, { useState } from "react";
import Upload from "./components/Upload";
import Dashboard from "./components/Dashboard";
import Chatbot from "./components/Chatbot";

export default function App() {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">Permit<strong>IQ</strong></span>
          </div>
          <div className="nav-links">
            <span>Dashboard</span>
            <span>History</span>
            <span>Help</span>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-bg">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
          <div className="grid-overlay" />
        </div>
        <div className="hero-content">
          <div className="badge">AI-Powered Permit Analysis</div>
          <h1>Understand any permit<br /><span className="gradient-text">in seconds.</span></h1>
          <p className="hero-sub">Upload a permit document and get an instant structured report — powered by Claude AI.</p>
        </div>
      </header>

      <main className="main">
        <div className="upload-section">
          <div className="section-label">
            <span className="step">01</span>
            <span>Upload Your Document</span>
          </div>
          <Upload setReport={setReport} setLoading={setLoading} />
        </div>

        {(loading || report) && (
          <div className="report-section">
            <div className="section-label">
              <span className="step">02</span>
              <span>Your Permit Report</span>
            </div>
            <Dashboard report={report} loading={loading} />
          </div>
        )}
      </main>

      <footer className="footer">
        <span>⬡ PermitIQ</span>
        <span>Powered by Claude AI</span>
      </footer>

      <Chatbot />
    </div>
  );
}
