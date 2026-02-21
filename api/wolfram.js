/**
 * Root-level Vercel Serverless Function — Wolfram Alpha Proxy
 * Route: /api/wolfram?q=<query>
 *
 * This file mirrors proofmaster-deploy/api/wolfram.js so deployments
 * still work when the Vercel project root is set to repository root.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: "Missing query parameter ?q=" });
  }

  const appId = process.env.WOLFRAM_APP_ID || "XQ83L8XH3L";
  if (!appId) {
    return res.status(500).json({
      error: "WOLFRAM_APP_ID not configured. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  try {
    const url = new URL("https://api.wolframalpha.com/v1/result");
    url.searchParams.set("appid", appId);
    url.searchParams.set("i", q.trim());
    url.searchParams.set("units", "metric");

    const upstream = await fetch(url.toString());
    const text = await upstream.text();

    if (!upstream.ok) {
      return res.status(200).json({
        result: null,
        error: `Wolfram returned no result for: "${q}"`,
      });
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({ result: text });
  } catch (err) {
    return res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
}
