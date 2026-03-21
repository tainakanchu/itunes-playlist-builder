import { chromium } from "playwright-core";
import { createServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Start a simple static server for the dist directory
  const { createServer: createHttpServer } = await import("http");
  const { readFileSync, existsSync } = await import("fs");

  const distDir = join(__dirname, "dist");
  const server = createHttpServer((req, res) => {
    let filePath = join(distDir, req.url === "/" ? "index.html" : req.url);
    if (!existsSync(filePath)) {
      filePath = join(distDir, "index.html");
    }
    const ext = filePath.split(".").pop();
    const mimeTypes = {
      html: "text/html",
      js: "application/javascript",
      css: "text/css",
      png: "image/png",
      ico: "image/x-icon",
    };
    const content = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });

  await new Promise((resolve) => server.listen(4173, resolve));
  console.log("Server running on http://localhost:4173");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });

  await page.goto("http://localhost:4173", { waitUntil: "networkidle" });
  // Wait for rendering
  await page.waitForTimeout(500);

  await page.screenshot({
    path: join(__dirname, "screenshot.png"),
    fullPage: false,
  });

  console.log("Screenshot saved to screenshot.png");

  await browser.close();
  server.close();
}

main().catch(console.error);
