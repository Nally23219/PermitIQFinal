import express from "express";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  const data = await pdf(req.file.buffer);
  res.json({ text: data.text });
});

export default router;
