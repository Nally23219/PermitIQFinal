import express from "express";
import axios from "axios";

const router = express.Router();

const SYSTEM = `You are PermitIQ Assistant, a helpful expert on permits and licensing.
You answer questions about construction & building permits, business licenses, zoning,
and general permitting processes clearly and concisely.
If a question is outside permitting topics, politely redirect the user back to permit-related questions.
Keep answers brief and practical — under 150 words unless more detail is truly needed.`;

router.post("/", async (req, res) => {
  const { message, history = [] } = req.body;
  const prior = history.slice(-10).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.text
  }));
  const messages = [...prior, { role: "user", content: message }];
  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      { model: "claude-sonnet-4-6", max_tokens: 400, system: SYSTEM, messages },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );
    res.json({ reply: response.data.content[0].text });
  } catch {
    res.status(500).json({ reply: "Sorry, I couldn't get a response right now." });
  }
});

export default router;
