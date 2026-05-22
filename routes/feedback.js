import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

router.post("/", async (req, res) => {
  const { report_id, rating, tab, neighborhood } = req.body;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("feedback")
    .insert({ report_id, rating, tab, neighborhood });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
