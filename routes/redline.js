import express from "express";
import multer from "multer";
import axios from "axios";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Word-wrap helper
function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

router.post("/", upload.array("plans", 10), async (req, res) => {
  try {
    const { analysis } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No plan files uploaded" });
    }

    // Ask Claude to extract structured redlines from the analysis text
    const extractRes = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: `You extract redline annotations from permit analysis text. 
Return ONLY a JSON array, no other text, no markdown. Each item must have:
{
  "page": 1,
  "title": "SHORT TITLE IN CAPS (max 40 chars)",
  "shows": "What the plan currently shows (max 80 chars)",
  "requires": "What code requires, cite article (max 80 chars)", 
  "fix": "Specific fix needed (max 100 chars)"
}
If page number is unclear, distribute annotations across pages evenly.
Return maximum 8 redlines total. Return only the JSON array.`,
        messages: [{ role: "user", content: `Extract redline annotations from this analysis:\n\n${analysis}` }]
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );

    let redlines = [];
    try {
      const raw = extractRes.data.content[0].text.trim();
      const clean = raw.replace(/```json|```/g, '').trim();
      redlines = JSON.parse(clean);
    } catch (e) {
      // Fallback: create a generic redline from the analysis
      redlines = [{ page: 1, title: "SEE PLAN REVIEW NOTES", shows: "See full analysis", requires: "Multiple code sections", fix: "Review all suggested edits in the analysis report" }];
    }

    // Build the output PDF
    const outDoc = await PDFDocument.create();
    const regularFont = await outDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await outDoc.embedFont(StandardFonts.HelveticaBold);

    // Process each uploaded plan file
    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
      const file = files[fileIdx];
      const isPDF = file.mimetype === 'application/pdf';

      let pageCount = 1;
      let sourcePdfDoc = null;

      if (isPDF) {
        try {
          sourcePdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
          pageCount = sourcePdfDoc.getPageCount();
          // Copy all pages from source
          const copiedPages = await outDoc.copyPages(sourcePdfDoc, [...Array(pageCount).keys()]);
          copiedPages.forEach(p => outDoc.addPage(p));
        } catch (e) {
          // If PDF loading fails, create a placeholder page
          const ph = outDoc.addPage([850, 1100]);
          ph.drawText(`Plan file: ${file.originalname}`, { x: 50, y: 550, size: 14, font: boldFont, color: rgb(0,0,0) });
          ph.drawText('(PDF could not be rendered — annotations shown below)', { x: 50, y: 520, size: 11, font: regularFont, color: rgb(0.4,0.4,0.4) });
        }
      } else {
        // Image file — embed it
        const page = outDoc.addPage([850, 1100]);
        try {
          let img;
          if (file.mimetype === 'image/png') {
            img = await outDoc.embedPng(file.buffer);
          } else {
            img = await outDoc.embedJpg(file.buffer);
          }
          const { width, height } = img.scale(1);
          const scale = Math.min(800 / width, 1000 / height);
          page.drawImage(img, { x: 25, y: 50, width: width * scale, height: height * scale });
        } catch (e) {
          page.drawText(`Plan: ${file.originalname}`, { x: 50, y: 550, size: 14, font: boldFont, color: rgb(0,0,0) });
        }
      }
    }

    // Now add a redline summary page at the end
    const summaryPage = outDoc.addPage([850, 1100]);
    
    // Header
    summaryPage.drawRectangle({ x: 0, y: 1040, width: 850, height: 60, color: rgb(0.04, 0.18, 0.42) });
    summaryPage.drawText('PERMITIQ — REDLINE ANNOTATION SUMMARY', { x: 30, y: 1063, size: 16, font: boldFont, color: rgb(1,1,1) });
    summaryPage.drawText('Boston Zoning Code & 780 CMR Compliance Review', { x: 30, y: 1047, size: 10, font: regularFont, color: rgb(0.8,0.85,1) });

    // Date
    summaryPage.drawText(`Generated: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, 
      { x: 600, y: 1055, size: 9, font: regularFont, color: rgb(0.8,0.85,1) });

    let yPos = 1010;

    // Draw each redline as a card
    for (let i = 0; i < redlines.length; i++) {
      const rl = redlines[i];
      const cardH = 110;
      
      if (yPos - cardH < 60) {
        // Need a new page
        const newPage = outDoc.addPage([850, 1100]);
        newPage.drawRectangle({ x: 0, y: 1040, width: 850, height: 60, color: rgb(0.04, 0.18, 0.42) });
        newPage.drawText('PERMITIQ — REDLINE ANNOTATIONS (CONTINUED)', { x: 30, y: 1063, size: 16, font: boldFont, color: rgb(1,1,1) });
        yPos = 1010;
      }

      const page = outDoc.getPage(outDoc.getPageCount() - 1);
      const cardY = yPos - cardH;
      
      // Card background
      page.drawRectangle({ x: 30, y: cardY, width: 790, height: cardH, color: rgb(1, 0.97, 0.97), borderColor: rgb(0.75, 0.1, 0.1), borderWidth: 1.5 });
      
      // Red left bar
      page.drawRectangle({ x: 30, y: cardY, width: 6, height: cardH, color: rgb(0.75, 0.1, 0.1) });
      
      // Redline number badge
      page.drawRectangle({ x: 44, y: cardY + cardH - 26, width: 24, height: 20, color: rgb(0.75, 0.1, 0.1) });
      page.drawText(`${i+1}`, { x: 50, y: cardY + cardH - 20, size: 11, font: boldFont, color: rgb(1,1,1) });
      
      // Title
      page.drawText(rl.title || `REDLINE ${i+1}`, { x: 76, y: cardY + cardH - 20, size: 11, font: boldFont, color: rgb(0.6, 0.05, 0.05) });
      
      // Page reference
      page.drawText(`Plan pg. ${rl.page || fileIdx+1}`, { x: 730, y: cardY + cardH - 20, size: 9, font: regularFont, color: rgb(0.5,0.1,0.1) });

      // Divider
      page.drawLine({ start: { x: 44, y: cardY + cardH - 30 }, end: { x: 812, y: cardY + cardH - 30 }, thickness: 0.5, color: rgb(0.8, 0.3, 0.3) });

      // Content rows
      const rows = [
        { label: 'SHOWS:', text: rl.shows || '', color: rgb(0.3,0,0) },
        { label: 'REQUIRES:', text: rl.requires || '', color: rgb(0.3,0,0) },
        { label: 'FIX:', text: rl.fix || '', color: rgb(0.6,0.05,0.05) },
      ];

      let rowY = cardY + cardH - 46;
      for (const row of rows) {
        page.drawText(row.label, { x: 44, y: rowY, size: 8, font: boldFont, color: rgb(0.5,0.1,0.1) });
        // Wrap text
        const lines = wrapText(row.text, 90);
        lines.forEach((line, li) => {
          page.drawText(line, { x: 110, y: rowY - (li * 11), size: 8.5, font: regularFont, color: row.color });
        });
        rowY -= Math.max(13, lines.length * 11 + 2);
      }

      yPos -= cardH + 12;
    }

    // Footer on last page
    const lastPage = outDoc.getPage(outDoc.getPageCount() - 1);
    lastPage.drawRectangle({ x: 0, y: 0, width: 850, height: 36, color: rgb(0.04, 0.18, 0.42) });
    lastPage.drawText('PermitIQ Boston · AI-Assisted Plan Review · For guidance only — not a substitute for licensed architect or attorney review', 
      { x: 30, y: 14, size: 8, font: regularFont, color: rgb(0.7, 0.75, 0.9) });

    // Also stamp a small redline marker on the actual plan pages
    const totalPlanPages = outDoc.getPageCount() - 1; // exclude summary page
    for (let i = 0; i < redlines.length && i < totalPlanPages; i++) {
      const rl = redlines[i];
      const targetPageIdx = Math.min((rl.page || 1) - 1, totalPlanPages - 1);
      const planPage = outDoc.getPage(targetPageIdx);
      const { width, height } = planPage.getSize();
      
      // Add a small red stamp in the corner
      const stampX = width - 200, stampY = height - 50;
      planPage.drawRectangle({ x: stampX, y: stampY, width: 190, height: 40, color: rgb(1, 0.9, 0.9), borderColor: rgb(0.8,0,0), borderWidth: 1.5 });
      planPage.drawText('⚠ REDLINES ATTACHED', { x: stampX + 8, y: stampY + 24, size: 9, font: boldFont, color: rgb(0.7, 0, 0) });
      planPage.drawText('See annotation summary page', { x: stampX + 8, y: stampY + 10, size: 8, font: regularFont, color: rgb(0.5, 0, 0) });
    }

    const pdfBytes = await outDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="PermitIQ_Redlined_Plans.pdf"');
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Redline error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
