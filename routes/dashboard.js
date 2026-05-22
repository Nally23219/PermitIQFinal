import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Simple password check middleware
function auth(req, res, next) {
  const pwd = req.headers["x-dashboard-password"] || req.query.pwd;
  if (pwd !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/stats", auth, async (req, res) => {
  const supabase = getSupabase();

  const [reportsRes, feedbackRes] = await Promise.all([
    supabase.from("reports").select("type, neighborhood, proj_type, odds_before, odds_after, created_at"),
    supabase.from("feedback").select("rating, tab, created_at")
  ]);

  const reports = reportsRes.data || [];
  const feedback = feedbackRes.data || [];

  // Aggregate stats
  const totalReports = reports.length;
  const byType = reports.reduce((acc, r) => { acc[r.type] = (acc[r.type]||0)+1; return acc; }, {});
  const byNeighborhood = reports.reduce((acc, r) => { if(r.neighborhood) acc[r.neighborhood] = (acc[r.neighborhood]||0)+1; return acc; }, {});
  const byProjType = reports.reduce((acc, r) => { if(r.proj_type) acc[r.proj_type] = (acc[r.proj_type]||0)+1; return acc; }, {});
  const avgOddsBefore = reports.filter(r=>r.odds_before).reduce((a,r)=>a+r.odds_before,0) / (reports.filter(r=>r.odds_before).length||1);
  const avgOddsAfter = reports.filter(r=>r.odds_after).reduce((a,r)=>a+r.odds_after,0) / (reports.filter(r=>r.odds_after).length||1);
  const thumbsUp = feedback.filter(f=>f.rating==='up').length;
  const thumbsDown = feedback.filter(f=>f.rating==='down').length;

  // Last 30 days activity
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
  const recentReports = reports.filter(r => r.created_at > thirtyDaysAgo).length;

  res.json({
    totalReports,
    recentReports,
    byType,
    byNeighborhood: Object.entries(byNeighborhood).sort((a,b)=>b[1]-a[1]).slice(0,10),
    byProjType: Object.entries(byProjType).sort((a,b)=>b[1]-a[1]).slice(0,8),
    avgOddsBefore: Math.round(avgOddsBefore),
    avgOddsAfter: Math.round(avgOddsAfter),
    thumbsUp,
    thumbsDown,
    satisfactionRate: Math.round(thumbsUp/(thumbsUp+thumbsDown||1)*100)
  });
});

export default router;
