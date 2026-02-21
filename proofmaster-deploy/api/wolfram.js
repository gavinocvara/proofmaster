/**
 * Vercel Serverless Function — Wolfram Alpha Proxy
 * Route: /api/wolfram?q=<query>
 *
 * Keeps WOLFRAM_APP_ID secret on the server.
 * Set it in Vercel Dashboard → Project → Settings → Environment Variables
 */

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: "Missing query parameter ?q=" });
  }

  const appId = process.env.WOLFRAM_APP_ID;

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

    // Wolfram returns 501 when it has no result
    if (!upstream.ok) {
      return res.status(200).json({
        result: null,
        error: `Wolfram returned no result for: "${q}"`,
      });
    }

    // Allow browser to cache result for 5 minutes
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    // Allow cross-origin from the same deployment
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({ result: text });
  } catch (err) {
    return res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
}
