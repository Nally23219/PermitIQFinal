import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import uploadRoute from "./routes/upload.js";
import claudeRoute from "./routes/claude.js";
import chatRoute from "./routes/chat.js";
import apiClaudeRoute from "./routes/apiclaude.js";
import redlineRoute from "./routes/redline.js";
import appeaLetterRoute from "./routes/appealetter.js";
import reportsRoute from "./routes/reports.js";
import feedbackRoute from "./routes/feedback.js";
import dashboardRoute from "./routes/dashboard.js";
import zoningRoute from "./routes/zoning.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.use("/upload", uploadRoute);
app.use("/claude", claudeRoute);
app.use("/chat", chatRoute);
app.use("/api/claude", apiClaudeRoute);
app.use("/api/redline", redlineRoute);
app.use("/api/appeal-letter", appeaLetterRoute);
app.use("/api/reports", reportsRoute);
app.use("/api/feedback", feedbackRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/zoning", zoningRoute);

app.use(express.static(path.join(__dirname, "client/public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/public/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on " + PORT));
