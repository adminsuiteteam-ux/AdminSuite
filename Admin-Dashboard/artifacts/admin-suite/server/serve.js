/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function verifyAdminToken(token, callback) {
  if (!token) {
    return callback(false);
  }

  const options = {
    hostname: "127.0.0.1",
    port: 8000,
    path: "/api/me/",
    method: "GET",
    headers: {
      "Authorization": `Token ${token}`,
      "Accept": "application/json"
    }
  };

  const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      if (res.statusCode === 200) {
        try {
          const user = JSON.parse(data);
          if (user && user.role === "admin") {
            return callback(true);
          }
        } catch (e) {
          // JSON parse failed
        }
      }
      callback(false);
    });
  });

  req.on("error", (e) => {
    console.error("Auth check request failed:", e.message);
    callback(false);
  });

  req.end();
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    setSecurityHeaders(res);
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  setSecurityHeaders(res);
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  setSecurityHeaders(res);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    setSecurityHeaders(res);
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    setSecurityHeaders(res);
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  setSecurityHeaders(res);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }

    if (pathname === "/") {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  if (pathname === "/admin/logs") {
    let token = "";
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Token ")) {
      token = authHeader.substring(6).trim();
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      token = url.searchParams.get("token") || "";
    }

    setSecurityHeaders(res);

    verifyAdminToken(token, (isAdmin) => {
      if (!isAdmin) {
        res.writeHead(403, { "content-type": "text/html; charset=utf-8" });
        res.end("<h1>403 Forbidden</h1><p>Unauthorized access to log viewer.</p>");
        return;
      }

      // Read log file from backend
      const logFilePath = path.resolve(__dirname, "..", "..", "..", "..", "admin-suite-backend", "backend.log");
      fs.readFile(logFilePath, "utf8", (err, data) => {
        if (err) {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end("<h1>Admin Logs</h1><p>No logs found or unable to read backend.log.</p>");
          return;
        }

        const escapedLogs = escapeHTML(data);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admin Suite System Logs</title>
            <style>
              body { font-family: monospace; background: #121214; color: #e1e1e6; padding: 20px; }
              pre { background: #1a1a1e; padding: 15px; border-radius: 8px; border: 1px solid #29292e; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
              h1 { color: #4f46e5; border-bottom: 1px solid #29292e; padding-bottom: 10px; }
            </style>
          </head>
          <body>
            <h1>Admin Suite System Logs</h1>
            <pre>${escapedLogs}</pre>
          </body>
          </html>
        `);
      });
    });
    return;
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
