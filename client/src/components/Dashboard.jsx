import React from "react";

export default function Dashboard({ report, loading }) {
  if (loading) {
    return (
      <div className="report-card loading-card">
        <div className="loading-lines">
          <div className="loading-line w80" />
          <div className="loading-line w60" />
          <div className="loading-line w90" />
          <div className="loading-line w50" />
          <div className="loading-line w70" />
        </div>
        <p className="loading-label">Generating your report…</p>
      </div>
    );
  }

  return (
    <div className="report-card">
      <div className="report-header">
        <span className="report-badge">✓ Analysis Complete</span>
      </div>
      <pre className="report-body">{report}</pre>
    </div>
  );
}
