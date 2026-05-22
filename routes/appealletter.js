import express from "express";
import axios from "axios";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const router = express.Router();

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

router.post("/", async (req, res) => {
  try {
    const { analysis, projType, neighborhood, denial } = req.body;

    // Ask Claude to write a formal appeal letter
    const letterRes = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: `You are a Boston zoning attorney drafting a formal ZBA appeal letter. 
Write a complete, professional appeal letter based on the analysis provided.

The letter must include:
1. Date (use today's date)
2. Proper salutation to: Zoning Board of Appeal, City of Boston, 1010 Massachusetts Avenue, Boston, MA 02118
3. Re: line with property address if known, or [PROPERTY ADDRESS]
4. Opening paragraph identifying the applicant and the ISD refusal being appealed
5. Statement of facts — describe the project and the violations cited
6. Legal argument — explain why relief should be granted, cite specific Boston Zoning Code articles, argue hardship or special permit criteria as appropriate
7. Request for specific relief (variance, special permit, etc.)
8. Closing paragraph
9. Signature block with [APPLICANT NAME], [ADDRESS], [PHONE], [EMAIL]

Write in formal legal language. Be specific — cite code articles from the analysis. 
Do NOT use markdown formatting, headers with #, or bullet points. Write in plain paragraphs only.
This will be rendered directly into a PDF letter.`,
        messages: [{
          role: "user",
          content: `Write the ZBA appeal letter based on this analysis:\n\n${analysis}\n\nProject type: ${projType || 'Not specified'}\nNeighborhood: ${neighborhood || 'Boston'}\nOriginal denial text: ${denial || 'See analysis'}`
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

    const letterText = letterRes.data.content[0].text.trim();

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    const pageWidth = 612;  // Letter size
    const pageHeight = 792;
    const margin = 72;      // 1 inch margins
    const textWidth = pageWidth - margin * 2;
    const lineHeight = 16;
    const fontSize = 11;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Header bar
    page.drawRectangle({ x: 0, y: pageHeight - 48, width: pageWidth, height: 48, color: rgb(0.04, 0.18, 0.42) });
    page.drawText('PERMITIQ BOSTON', { x: margin, y: pageHeight - 20, size: 13, font: boldFont, color: rgb(1,1,1) });
    page.drawText('Zoning Board of Appeal Letter', { x: margin, y: pageHeight - 36, size: 9, font: regularFont, color: rgb(0.7,0.8,1) });
    page.drawText('DRAFT — Review with licensed attorney before filing', { x: 340, y: pageHeight - 28, size: 8, font: italicFont, color: rgb(1,0.85,0.5) });

    y = pageHeight - 72;

    // Split letter into paragraphs and render
    const paragraphs = letterText.split(/\n\n+/).filter(p => p.trim());

    for (const para of paragraphs) {
      const cleanPara = para.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanPara) continue;

      // Check if it looks like a header/label line (short, ends with colon, or all caps)
      const isLabel = cleanPara.length < 60 && (cleanPara.endsWith(':') || cleanPara === cleanPara.toUpperCase());
      const font = isLabel ? boldFont : regularFont;
      const size = isLabel ? 11 : fontSize;

      const lines = wrapText(cleanPara, Math.floor(textWidth / (size * 0.52)));

      // Check if we need a new page
      const blockHeight = lines.length * lineHeight + 10;
      if (y - blockHeight < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      for (const line of lines) {
        if (y < margin + 40) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(line, { x: margin, y, size, font, color: rgb(0.08, 0.08, 0.08) });
        y -= lineHeight;
      }
      y -= 10; // paragraph spacing
    }

    // Footer on each page
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const p = pdfDoc.getPage(i);
      p.drawLine({ start:{x:margin,y:margin-10}, end:{x:pageWidth-margin,y:margin-10}, thickness:0.5, color:rgb(0.7,0.7,0.7) });
      p.drawText('DRAFT — PermitIQ Boston  |  For guidance only — not legal advice. Consult a licensed attorney before filing.', 
        { x: margin, y: margin-24, size: 7, font: italicFont, color: rgb(0.5,0.5,0.5) });
      p.drawText(`Page ${i+1} of ${pageCount}`, { x: pageWidth - margin - 40, y: margin-24, size: 7, font: regularFont, color: rgb(0.5,0.5,0.5) });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="PermitIQ_ZBA_Appeal_Letter.pdf"');
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Appeal letter error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
