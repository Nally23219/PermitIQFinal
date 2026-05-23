import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req, res) => {
  const { system, messages } = req.body;

  // Check if any message contains a document (PDF) type
  const hasPDF = JSON.stringify(messages).includes('"type":"document"');

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system,
        messages
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          ...(hasPDF ? { "anthropic-beta": "pdfs-2024-09-25" } : {})
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error("Claude API error:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    const msg = err.response?.data || { error: { message: err.message } };
    res.status(status).json(msg);
  }
});

export default router;
