const BACKEND_ORIGIN = "https://mindbridge-ai-21yy.onrender.com";
const FRONTEND_ORIGIN = "https://mindbridge-ai-ten.vercel.app";

export default async function handler(req, res) {
  try {
    const rawPath = req.query?.path;

    const forwardedPath = Array.isArray(rawPath)
      ? rawPath.join("/")
      : String(rawPath || "").replace(/^\/+/, "");

    const targetUrl = `${BACKEND_ORIGIN}/api/${forwardedPath}`;

    const headers = new Headers();

    for (const name of [
      "accept",
      "accept-language",
      "content-type",
      "cookie",
      "user-agent",
    ]) {
      const value = req.headers[name];

      if (value) {
        headers.set(
          name,
          Array.isArray(value) ? value.join(", ") : value
        );
      }
    }

    // 給 Render 原本的 Origin 安全檢查使用
    headers.set("origin", FRONTEND_ORIGIN);

    let body;

    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body == null) {
        body = undefined;
      } else if (
        Buffer.isBuffer(req.body) ||
        typeof req.body === "string"
      ) {
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
    if (contentType) {
      res.setHeader("content-type", contentType);
    }

    const setCookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [];

    if (setCookies.length > 0) {
      res.setHeader("set-cookie", setCookies);
    } else {
      const setCookie = upstream.headers.get("set-cookie");

      if (setCookie) {
        res.setHeader("set-cookie", setCookie);
      }
    }

    const payload = Buffer.from(await upstream.arrayBuffer());

    return res.send(payload);
  } catch (error) {
    console.error("Vercel API proxy failed:", error);

    return res.status(502).json({
      success: false,
      message: "API proxy unavailable",
    });
  }
}