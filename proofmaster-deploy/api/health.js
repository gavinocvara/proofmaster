/**
 * Vercel Serverless Function — Health Check
 * Route: /api/health
 *
 * This endpoint is intentionally lightweight so deployments
 * can be validated without hitting external APIs.
 */
export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  return res.status(200).json({
    ok: true,
    service: "proofmaster-api",
    timestamp: new Date().toISOString(),
    hasWolframAppId: Boolean(process.env.WOLFRAM_APP_ID),
  });
}
