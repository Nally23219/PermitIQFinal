import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

// Save a report and return a share ID
router.post("/save", async (req, res) => {
  const { type, analysis, neighborhood, projType, odds } = req.body;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .insert({ type, analysis, neighborhood, proj_type: projType, odds_before: odds?.current, odds_after: odds?.revised })
    .select("id")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id, url: `/report/${data.id}` });
});

// Get a saved report by ID
router.get("/:id", async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "Report not found" });
  res.json(data);
});

export default router;
