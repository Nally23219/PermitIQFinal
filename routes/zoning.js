import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/lookup", async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Address required" });

  try {
    // Ask Claude to look up zoning info for this Boston address
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: `You are a Boston zoning expert. When given a Boston address, return ONLY a JSON object with this exact structure, no other text:
{
  "address": "full formatted address",
  "neighborhood": "neighborhood name",
  "zoningDistrict": { "ZONE_": "zoning code e.g. 3F-2000", "ARTICLE": "e.g. Article 68" },
  "landUse": "e.g. Residential",
  "notes": "1-2 sentences about key zoning rules for this district",
  "bpdaLink": "https://bostonplans.org/zoning/zoning-viewer"
}
Use your knowledge of Boston zoning districts. If unsure of exact zone, give the most likely one based on neighborhood.`,
        messages: [{ role: "user", content: `What is the zoning for: ${address}, Boston MA` }]
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );

    const raw = response.data.content[0].text.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    res.json({ ...data, lat: null, lng: null, source: "ai" });

  } catch (err) {
    console.error("Zoning lookup error:", err.message);
    res.status(500).json({ error: "Lookup failed: " + err.message });
  }
});

export default router;
