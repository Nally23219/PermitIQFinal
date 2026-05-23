import express from "express";
import Stripe from "stripe";

const router = express.Router();

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

router.post("/create-checkout", async (req, res) => {
  const { reportId, reportType } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: "payment",
      success_url: `https://permit-iq.us/app?report=${reportId}&unlocked=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://permit-iq.us/app?cancelled=true`,
      metadata: { reportId: reportId || "unknown", reportType: reportType || "analysis" }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/verify/:sessionId", async (req, res) => {
  const stripe = getStripe();
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status === "paid") {
      res.json({ paid: true, reportId: session.metadata.reportId });
    } else {
      res.json({ paid: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
