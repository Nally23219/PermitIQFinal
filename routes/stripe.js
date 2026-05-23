import express from "express";
import Stripe from "stripe";

const router = express.Router();

router.post("/create-checkout", async (req, res) => {
  const { reportId, reportType } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not set in environment" });
  }
  if (!process.env.STRIPE_PRICE_ID) {
    return res.status(500).json({ error: "STRIPE_PRICE_ID not set in environment" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "payment",
      success_url: `https://permit-iq.us/app?report=${reportId}&unlocked=true`,
      cancel_url: `https://permit-iq.us/app?cancelled=true`,
      metadata: {
        reportId: reportId || "unknown",
        reportType: reportType || "analysis"
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe error:", err.message, err.type, err.code);
    res.status(500).json({
      error: err.message,
      type: err.type,
      code: err.code
    });
  }
});

router.get("/verify/:sessionId", async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      paid: session.payment_status === "paid",
      reportId: session.metadata?.reportId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
