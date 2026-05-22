import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import uploadRoute from "./routes/upload.js";
import claudeRoute from "./routes/claude.js";
import chatRoute from "./routes/chat.js";
import apiClaudeRoute from "./routes/apiclaude.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// API routes
app.use("/upload", uploadRoute);
app.use("/claude", claudeRoute);
app.use("/chat", chatRoute);
app.use("/api/claude", apiClaudeRoute);

// Serve the static HTML app
app.use(express.static(path.join(__dirname, "client/public")));

// Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/public/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on " + PORT));
