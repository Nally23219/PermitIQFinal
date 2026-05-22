import express from "express";
import { askClaude } from "../services/anthropic.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { text } = req.body;

  const result = await askClaude(
    `Turn this into a structured permit report:\n\n${text}`
  );

  res.json({ result });
});

export default router;
