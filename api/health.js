/**
 * Root-level Vercel Serverless Function — Health Check
 * Route: /api/health
 *
 * This mirrors proofmaster-deploy/api/health.js so deployments
 * still work when the Vercel project root is set to repository root.
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
