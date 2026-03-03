// app/server.js
// This tiny app runs INSIDE your Kubernetes pod.
// It reads secrets from env vars (injected by K8s Secret)
// and from the volume mount (injected by CSI Driver or K8s Secret volume).
// Hit the endpoints to see your secrets are flowing through correctly.

const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const SECRET_KEYS = ["DB_USERNAME", "DB_PASSWORD", "DB_HOST", "DB_PORT"];
const GITHUB_REPO_URL = "https://github.com/Osomudeya/k8s-secrets-lab";

// Helper: mask a secret value for safe display
// "super-secret-123" → "************123"
function mask(value) {
  if (!value) return "(not set)";
  if (value.length <= 4) return "****";
  return "*".repeat(value.length - 4) + value.slice(-4);
}

// Helper: safely read a file (for volume mount secrets)
function readFile(path) {
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return "(file not found)";
  }
}

// Helper: escape HTML for safe injection into table cells
function escapeHtml(s) {
  if (s == null || s === "(not set)" || s === "(file not found)") return s;
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build comparison data for status table and /secrets/compare
function getComparison() {
  const comparison = {};
  let allMatch = true;
  for (const key of SECRET_KEYS) {
    const envVal = process.env[key] || "(not set)";
    const volVal = readFile(`/etc/secrets/${key}`);
    const volDisplay = volVal === "(file not found)" ? "(not set)" : volVal;
    const envRaw = process.env[key] || "";
    const volRaw = volVal === "(file not found)" ? "" : volVal;
    const match = envRaw === volRaw;
    if (!match) allMatch = false;
    comparison[key] = {
      env: envVal,
      volume: volDisplay,
      match,
      envDisplay: key === "DB_PASSWORD" ? mask(envVal) : envVal,
      volumeDisplay: key === "DB_PASSWORD" ? mask(volDisplay) : volDisplay,
    };
  }
  return { comparison, allMatch };
}

const server = http.createServer((req, res) => {
  // Health check — required for K8s readiness/liveness probes
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  // Show secrets from ENV VARS (injected via envFrom: secretRef)
  if (req.url === "/secrets/env") {
    const secrets = {
      source: "environment variables (from K8s Secret → envFrom)",
      DB_USERNAME: process.env.DB_USERNAME || "(not set)",
      DB_PASSWORD: mask(process.env.DB_PASSWORD),
      DB_HOST: process.env.DB_HOST || "(not set)",
      DB_PORT: process.env.DB_PORT || "(not set)",
      rotation_note: "These values were set at pod startup. They will NOT update if the secret rotates. To get new values: restart the pod, or use Stakater Reloader.",
      pod: process.env.HOSTNAME || "(unknown)",
      rendered_at: new Date().toISOString(),
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(secrets, null, 2));
    return;
  }

  // Show secrets from VOLUME MOUNT (updates without pod restart!)
  if (req.url === "/secrets/volume") {
    const secrets = {
      source: "volume mount (from K8s Secret volume or CSI Driver)",
      DB_PASSWORD: mask(readFile("/etc/secrets/DB_PASSWORD")),
      DB_USERNAME: readFile("/etc/secrets/DB_USERNAME"),
      DB_HOST: readFile("/etc/secrets/DB_HOST"),
      DB_PORT: readFile("/etc/secrets/DB_PORT"),
      rotation_note: "These values are read from the file system on every request. They update automatically ~60s after ESO syncs the K8s Secret (kubelet refresh cycle).",
      pod: process.env.HOSTNAME || "(unknown)",
      rendered_at: new Date().toISOString(),
    };
    // Normalize (file not found) to (not set) for display
    for (const k of Object.keys(secrets)) {
      if (secrets[k] === "(file not found)") secrets[k] = "(not set)";
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(secrets, null, 2));
    return;
  }

  // Compare env vs volume — for programmatic verification (e.g. rotation script)
  if (req.url === "/secrets/compare") {
    const { comparison, allMatch } = getComparison();
    const diffs = Object.entries(comparison).filter(([, v]) => !v.match);
    const rotationDetected = diffs.length > 0;
    const payload = {
      pod: process.env.HOSTNAME || "(unknown)",
      rendered_at: new Date().toISOString(),
      comparison: Object.fromEntries(
        Object.entries(comparison).map(([k, v]) => [
          k,
          {
            env: k === "DB_PASSWORD" ? mask(v.env) : v.env,
            volume: k === "DB_PASSWORD" ? mask(v.volume) : v.volume,
            match: v.match,
          },
        ])
      ),
      all_match: allMatch,
      rotation_detected: rotationDetected,
      message: rotationDetected
        ? `Rotation detected: ${diffs.length} key(s) differ between env and volume. Volume has the new value. Pod needs restart to pick up new env vars.`
        : "Env and volume values match.",
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload, null, 2));
    return;
  }

  // Home — redesigned UI with status table
  if (req.url === "/") {
    const { comparison, allMatch } = getComparison();
    const podName = process.env.HOSTNAME || "unknown";
    const uptimeSec = Math.floor(process.uptime());
    const startedAt = new Date(Date.now() - process.uptime() * 1000).toISOString();
    const now = new Date().toISOString();

    const rows = SECRET_KEYS.map(
      (key) => `
    <tr>
      <td class="key">${escapeHtml(key)}</td>
      <td>${escapeHtml(comparison[key].envDisplay)}</td>
      <td>${escapeHtml(comparison[key].volumeDisplay)}</td>
      <td class="match ${comparison[key].match ? "ok" : "diff"}">${comparison[key].match ? "✓" : "✗"}</td>
    </tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><!-- must be first in head so emoji/unicode render correctly -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K8s Secrets Lab — Sample App</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Space Mono', monospace; background: #080c18; color: #dde4f0; padding: 40px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
    h1 { color: #00e5ff; margin: 0; font-size: 1.5rem; }
    .subtitle { color: #536070; font-size: 0.85rem; margin-bottom: 12px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.2); color: #10b981; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .badge::before { content: '●'; }
    .card { display: block; text-decoration: none; color: inherit; padding: 16px 18px; margin: 12px 0; background: #0f1623; border: 1px solid #1c2a3e; border-radius: 8px; border-left: 4px solid #00e5ff; transition: border-color .15s; }
    .card:hover { border-left-color: #00e5ff; border-color: #00e5ff; }
    .card.volume { border-left-color: #7c3aed; }
    .card.volume:hover { border-color: #7c3aed; }
    .card-path { font-weight: 700; color: #00e5ff; font-size: 0.9rem; margin-bottom: 4px; }
    .card-desc { color: #8ab; font-size: 0.8rem; margin-bottom: 6px; }
    .card-tag { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; }
    .card-tag.env { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .card-tag.vol { background: rgba(16,185,129,0.15); color: #10b981; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.8rem; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #1c2a3e; }
    th { color: #536070; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    td.key { color: #00e5ff; font-weight: 600; }
    td.match.ok { color: #10b981; font-weight: 700; }
    td.match.diff { color: #ef4444; font-weight: 700; }
    .table-caption { font-size: 0.75rem; color: #536070; margin-top: 8px; }
    .table-caption .diff-note { color: #ef4444; }
    .health { padding: 12px 18px; margin: 16px 0; background: #0f1623; border: 1px solid #1c2a3e; border-radius: 8px; font-size: 0.8rem; }
    .health span { margin-right: 16px; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #1c2a3e; font-size: 0.75rem; color: #536070; }
    .footer a { color: #00e5ff; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 K8s Secrets Lab</h1>
    <span class="badge">LIVE</span>
  </div>
  <p class="subtitle">Sample app running inside pod: <strong>${escapeHtml(podName)}</strong></p>

  <a href="/secrets/env" class="card">
    <div class="card-path">/secrets/env</div>
    <div class="card-desc">View secrets from environment variables (set at pod startup)</div>
    <span class="card-tag env">⚠ Stale after rotation until pod restart</span>
  </a>
  <a href="/secrets/volume" class="card volume">
    <div class="card-path">/secrets/volume</div>
    <div class="card-desc">View secrets from volume mount (read from filesystem on each request)</div>
    <span class="card-tag vol">✓ Updates automatically after kubelet sync (~60s)</span>
  </a>

  <table>
    <thead>
      <tr><th>Key</th><th>Env Var</th><th>Volume Mount</th><th>Match</th></tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
  <p class="table-caption"><span class="diff-note">✗ in Match column</span> = rotation happened. Volume updated, env var stale. Restart pod or wait for Reloader.</p>

  <div class="health">
    <span>Status: <strong style="color:#10b981">OK</strong></span>
    <span>Uptime: ${uptimeSec}s</span>
    <span>Pod: ${escapeHtml(podName)}</span>
    <span>Started: ${startedAt}</span>
  </div>

  <div class="footer">
    🔄 Last rendered: ${now}<br>
    <a href="${GITHUB_REPO_URL}/blob/main/rotation/test-rotation.sh" target="_blank" rel="noopener">View rotation script →</a>
  </div>
</body>
</html>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`✅ App running on port ${PORT}`);
  console.log(`   DB_USERNAME: ${process.env.DB_USERNAME || "(not set)"}`);
  console.log(`   DB_PASSWORD: ${mask(process.env.DB_PASSWORD)}`);
  console.log(`   DB_HOST:     ${process.env.DB_HOST || "(not set)"}`);
});
