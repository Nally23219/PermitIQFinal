import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req, res) => {
  const { caseNumber } = req.query;
  if (!caseNumber) return res.status(400).json({ error: "Case number required" });

  try {
    // Scrape Boston's ISD permit/case search
    const searchUrl = `https://www.boston.gov/departments/inspectional-services/search-permits-and-cases`;
    
    // Try the Boston Open Data API for permit records
    const permitRes = await axios.get(
      "https://data.boston.gov/api/3/action/datastore_search",
      {
        params: {
          resource_id: "6ddcd912-32a0-43df-9908-63574f8c7e77",
          q: caseNumber.trim(),
          limit: 1
        },
        timeout: 8000,
        headers: { "Accept": "application/json" }
      }
    );

    const records = permitRes.data?.result?.records;
    if (records && records.length > 0) {
      const r = records[0];
      return res.json({
        found: true,
        caseNumber: r.permitnumber || r.case_no || caseNumber,
        status: r.status || r.permitstatus || "Unknown",
        address: r.address || r.location || "N/A",
        description: r.description || r.worktype || "N/A",
        applicant: r.applicant || r.owner || "N/A",
        issued: r.issued_date || r.permitteddate || null,
        expiration: r.expiration_date || null,
        source: "Boston Open Data"
      });
    }

    // Fallback: Ask Claude to interpret the case number format
    const claudeRes = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: "You are a Boston ISD permit expert. When given a case number, explain what type of case it is based on the prefix format, and provide guidance on how to look it up. Return ONLY a JSON object with: caseType, description, lookupUrl, tips. No other text.",
        messages: [{
          role: "user",
          content: `Interpret this Boston ISD/ZBA case number: ${caseNumber}`
        }]
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );

    const raw = claudeRes.data.content[0].text.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const info = JSON.parse(clean);

    res.json({
      found: false,
      caseNumber,
      caseType: info.caseType,
      description: info.description,
      lookupUrl: info.lookupUrl || "https://www.boston.gov/departments/inspectional-services",
      tips: info.tips,
      source: "ai-interpreted"
    });

  } catch (err) {
    console.error("Case lookup error:", err.message);
    res.status(500).json({ error: "Could not look up case: " + err.message });
  }
});

export default router;
