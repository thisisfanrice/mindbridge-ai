const BACKEND_ORIGIN = "https://mindbridge-ai-21yy.onrender.com";
const FRONTEND_ORIGIN = "https://mindbridge-ai-ten.vercel.app";

export default async function handler(req, res) {
  try {
    const targetUrl = `${BACKEND_ORIGIN}${req.url}`;

    const headers = new Headers();

    // Forward only headers the backend actually needs.
    const passThrough = [
      "accept",
      "accept-language",
      "content-type",
      "cookie",
      "user-agent",
    ];

    for (const name of passThrough) {
      const value = req.headers[name];
      if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }

    // The browser request is same-origin to Vercel. Render still performs its
    // own mutation-origin check, so explicitly present the trusted frontend.
    headers.set("origin", FRONTEND_ORIGIN);

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body == null) {
        body = undefined;
      } else if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
      }
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    res.status(upstream.status);

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) res.setHeader("cache-control", cacheControl);

    // Preserve the backend's HttpOnly session cookie, but because this
    // response comes from Vercel, Safari stores it as a first-party cookie.
    const setCookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [];

    if (setCookies.length > 0) {
      res.setHeader("set-cookie", setCookies);
    } else {
      const setCookie = upstream.headers.get("set-cookie");
      if (setCookie) res.setHeader("set-cookie", setCookie);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error("Vercel API proxy failed:", error);
    return res.status(502).json({
      success: false,
      message: "API proxy unavailable",
    });
  }
}
