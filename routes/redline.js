import express from "express";
import multer from "multer";
import axios from "axios";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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
    const { analysis, neighborhood, scope } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No plan files uploaded" });
    }

    // Build message content — send actual plan images to Claude so it can see them
    const content = [];

    for (const f of files) {
      const b64 = f.buffer.toString('base64');
      const mtype = f.mimetype || 'image/jpeg';
      if (mtype.includes('pdf')) {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } });
      } else {
        content.push({ type: 'image', source: { type: 'base64', media_type: mtype, data: b64 } });
      }
    }

    content.push({
      type: 'text',
      text: `You are a Boston zoning and building code expert performing a detailed redline review of these construction plans.

Prior analysis summary:
${analysis}

Project context: ${scope || 'Not specified'} in ${neighborhood || 'Boston'}

Your task: Look carefully at the actual uploaded plans. Identify SPECIFIC, MEASURABLE violations visible in the drawings. For each one, reference what you actually see — exact dimensions, labels, notes, or drawing elements on the sheets.

Return ONLY a JSON array with no other text, no markdown backticks. Maximum 8 items. Each item:
{
  "page": <page number where this is visible, integer>,
  "title": "<SHORT TITLE IN CAPS, max 35 chars>",
  "shows": "<What the plan literally shows — cite the actual dimension or label you see, max 90 chars>",
  "requires": "<What Boston code requires — cite specific article and section, max 90 chars>",
  "fix": "<Exact change needed on the drawings to achieve compliance, max 110 chars>"
}

Only include redlines for things you can actually see in the plans. Do not invent violations. If a plan is compliant, say so with fewer items.`
    });

    // Call Claude with the actual plan images
    const extractRes = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content }]
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
      if (!Array.isArray(redlines)) redlines = [];
    } catch (e) {
      console.error('JSON parse error:', e.message);
      redlines = [{
        page: 1,
        title: "REVIEW NOTES",
        shows: "See full analysis report",
        requires: "Multiple Boston Zoning Code sections",
        fix: "Review all suggested edits in the analysis report"
      }];
    }

    // Build the output PDF
    const outDoc = await PDFDocument.create();
    const regularFont = await outDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await outDoc.embedFont(StandardFonts.HelveticaBold);

    // Copy/embed original plan pages
    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
      const file = files[fileIdx];
      const isPDF = file.mimetype === 'application/pdf';

      if (isPDF) {
        try {
          const sourcePdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
          const pageCount = sourcePdfDoc.getPageCount();
          const copiedPages = await outDoc.copyPages(sourcePdfDoc, [...Array(pageCount).keys()]);
          copiedPages.forEach(p => outDoc.addPage(p));
        } catch (e) {
          const ph = outDoc.addPage([850, 1100]);
          ph.drawText(`Plan: ${file.originalname}`, { x: 50, y: 550, size: 14, font: boldFont, color: rgb(0,0,0) });
          ph.drawText('PDF could not be rendered — see redline summary below', { x: 50, y: 520, size: 11, font: regularFont, color: rgb(0.4,0.4,0.4) });
        }
      } else {
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

    // Stamp "REDLINES ATTACHED" on plan pages that have annotations
    const planPageCount = outDoc.getPageCount();
    const pagesWithRedlines = new Set(redlines.map(r => Math.min((r.page||1)-1, planPageCount-1)));
    for (const pageIdx of pagesWithRedlines) {
      const planPage = outDoc.getPage(pageIdx);
      const { width, height } = planPage.getSize();
      const stampX = width - 205, stampY = height - 52;
      planPage.drawRectangle({ x: stampX, y: stampY, width: 195, height: 42, color: rgb(1, 0.9, 0.9), borderColor: rgb(0.8,0,0), borderWidth: 2 });
      planPage.drawRectangle({ x: stampX, y: stampY, width: 5, height: 42, color: rgb(0.8,0,0) });
      planPage.drawText('REDLINES ATTACHED', { x: stampX+12, y: stampY+26, size: 9, font: boldFont, color: rgb(0.7,0,0) });
      planPage.drawText('See annotation summary page', { x: stampX+12, y: stampY+12, size: 8, font: regularFont, color: rgb(0.5,0,0) });
    }

    // Redline summary page
    const summaryPage = outDoc.addPage([850, 1100]);
    summaryPage.drawRectangle({ x: 0, y: 1040, width: 850, height: 60, color: rgb(0.04, 0.18, 0.42) });
    summaryPage.drawText('PERMITIQ  REDLINE ANNOTATION SUMMARY', { x: 30, y: 1063, size: 16, font: boldFont, color: rgb(1,1,1) });
    summaryPage.drawText('Boston Zoning Code & 780 CMR Compliance Review', { x: 30, y: 1047, size: 10, font: regularFont, color: rgb(0.8,0.85,1) });
    summaryPage.drawText(new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }), { x: 660, y: 1055, size: 9, font: regularFont, color: rgb(0.8,0.85,1) });

    // Redline count badge
    summaryPage.drawRectangle({ x: 30, y: 995, width: 790, height: 32, color: rgb(0.97, 0.93, 0.93), borderColor: rgb(0.75,0.1,0.1), borderWidth: 1 });
    summaryPage.drawText(`${redlines.length} redline${redlines.length!==1?'s':''} identified from plan review`, { x: 44, y: 1007, size: 11, font: boldFont, color: rgb(0.6,0.05,0.05) });
    summaryPage.drawText('All annotations based on actual plan drawings reviewed by AI', { x: 44, y: 995, size: 8, font: regularFont, color: rgb(0.5,0.1,0.1) });

    let yPos = 980;
    let currentSummaryPage = summaryPage;

    for (let i = 0; i < redlines.length; i++) {
      const rl = redlines[i];
      const showsLines = wrapText(rl.shows||'', 88);
      const requiresLines = wrapText(rl.requires||'', 88);
      const fixLines = wrapText(rl.fix||'', 88);
      const cardH = 38 + (showsLines.length + requiresLines.length + fixLines.length) * 12;

      if (yPos - cardH < 60) {
        const np = outDoc.addPage([850, 1100]);
        np.drawRectangle({ x: 0, y: 1040, width: 850, height: 60, color: rgb(0.04, 0.18, 0.42) });
        np.drawText('PERMITIQ  REDLINES (CONTINUED)', { x: 30, y: 1063, size: 16, font: boldFont, color: rgb(1,1,1) });
        currentSummaryPage = np;
        yPos = 1010;
      }

      const cardY = yPos - cardH;
      currentSummaryPage.drawRectangle({ x: 30, y: cardY, width: 790, height: cardH, color: rgb(1, 0.97, 0.97), borderColor: rgb(0.75, 0.1, 0.1), borderWidth: 1.5 });
      currentSummaryPage.drawRectangle({ x: 30, y: cardY, width: 6, height: cardH, color: rgb(0.75, 0.1, 0.1) });

      // Number badge
      currentSummaryPage.drawRectangle({ x: 44, y: cardY+cardH-22, width: 20, height: 18, color: rgb(0.75,0.1,0.1) });
      currentSummaryPage.drawText(`${i+1}`, { x: i<9?49:47, y: cardY+cardH-17, size: 10, font: boldFont, color: rgb(1,1,1) });

      // Title + page ref
      currentSummaryPage.drawText(rl.title||`REDLINE ${i+1}`, { x: 72, y: cardY+cardH-17, size: 10, font: boldFont, color: rgb(0.6,0.05,0.05) });
      currentSummaryPage.drawText(`Plan p.${rl.page||1}`, { x: 750, y: cardY+cardH-17, size: 8, font: regularFont, color: rgb(0.5,0.1,0.1) });

      // Divider
      currentSummaryPage.drawLine({ start:{x:44,y:cardY+cardH-26}, end:{x:812,y:cardY+cardH-26}, thickness:0.5, color:rgb(0.8,0.3,0.3) });

      let rowY = cardY + cardH - 38;
      const rows = [
        { label:'SHOWS:', lines: showsLines, color: rgb(0.25,0,0) },
        { label:'REQUIRES:', lines: requiresLines, color: rgb(0.25,0,0) },
        { label:'FIX:', lines: fixLines, color: rgb(0.55,0.05,0.05) },
      ];
      for (const row of rows) {
        currentSummaryPage.drawText(row.label, { x:44, y:rowY, size:8, font:boldFont, color:rgb(0.5,0.1,0.1) });
        row.lines.forEach((line, li) => {
          currentSummaryPage.drawText(line, { x:110, y:rowY-(li*12), size:8.5, font:regularFont, color:row.color });
        });
        rowY -= row.lines.length * 12 + 3;
      }

      yPos -= cardH + 14;
    }

    // Footer
    const lastPage = outDoc.getPage(outDoc.getPageCount()-1);
    lastPage.drawRectangle({ x:0, y:0, width:850, height:32, color:rgb(0.04,0.18,0.42) });
    lastPage.drawText('PermitIQ Boston  |  AI-Assisted Plan Review  |  For guidance only — not a substitute for a licensed architect or attorney',
      { x:30, y:11, size:8, font:regularFont, color:rgb(0.7,0.75,0.9) });

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
