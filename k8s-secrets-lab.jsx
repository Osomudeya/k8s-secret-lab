import { useState, useEffect, useRef } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0e1a;
    --surface: #111827;
    --surface2: #1a2235;
    --border: #1e2d45;
    --accent: #00e5ff;
    --accent2: #7c3aed;
    --accent3: #f59e0b;
    --green: #10b981;
    --red: #ef4444;
    --text: #e2e8f0;
    --muted: #64748b;
    --mono: 'Space Mono', monospace;
    --sans: 'Syne', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); min-height: 100vh; }

  .app { display: flex; min-height: 100vh; }

  /* SIDEBAR */
  .sidebar {
    width: 280px; min-height: 100vh; background: var(--surface);
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
    position: sticky; top: 0; height: 100vh; overflow-y: auto; flex-shrink: 0;
  }
  .sidebar-logo {
    padding: 24px 20px 16px; border-bottom: 1px solid var(--border);
  }
  .logo-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    padding: 6px 12px; border-radius: 6px; margin-bottom: 10px;
  }
  .logo-badge span { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #fff; }
  .sidebar-title { font-size: 16px; font-weight: 800; color: var(--text); line-height: 1.3; }
  .sidebar-subtitle { font-size: 11px; color: var(--muted); margin-top: 4px; font-family: var(--mono); }

  .sidebar-nav { padding: 12px 0; flex: 1; }
  .nav-section { padding: 8px 20px 4px; font-size: 10px; font-weight: 700; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }

  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 20px;
    cursor: pointer; transition: all 0.15s; position: relative;
    border-left: 3px solid transparent; font-size: 13px; color: var(--muted);
  }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { border-left-color: var(--accent); background: rgba(0,229,255,0.06); color: var(--accent); }
  .nav-item.active .nav-icon { color: var(--accent); }
  .nav-icon { font-size: 16px; width: 20px; text-align: center; }
  .nav-label { font-weight: 600; flex: 1; }
  .nav-badge {
    font-size: 9px; padding: 2px 6px; border-radius: 10px;
    background: var(--accent2); color: #fff; font-weight: 700; letter-spacing: 1px;
  }
  .nav-done { color: var(--green); font-size: 12px; }

  .sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
  .progress-bar-wrap { background: var(--border); border-radius: 4px; height: 4px; margin-bottom: 6px; }
  .progress-bar-fill { height: 4px; border-radius: 4px; background: linear-gradient(90deg, var(--accent2), var(--accent)); transition: width 0.5s; }
  .progress-text { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  /* MAIN */
  .main { flex: 1; overflow-y: auto; }

  /* HERO */
  .hero {
    background: linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0d1b2e 100%);
    padding: 60px 60px 50px; border-bottom: 1px solid var(--border); position: relative; overflow: hidden;
  }
  .hero::before {
    content: ''; position: absolute; top: -50%; right: -10%; width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%); pointer-events: none;
  }
  .hero::after {
    content: ''; position: absolute; bottom: -30%; left: 20%; width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%); pointer-events: none;
  }
  .hero-tag {
    display: inline-flex; align-items: center; gap: 6px; background: rgba(0,229,255,0.1);
    border: 1px solid rgba(0,229,255,0.2); padding: 4px 12px; border-radius: 20px;
    font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 1.5px; margin-bottom: 20px;
    font-family: var(--mono);
  }
  .hero h1 { font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 16px; }
  .hero h1 span { background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero-desc { font-size: 15px; color: var(--muted); max-width: 560px; line-height: 1.7; margin-bottom: 28px; }
  .hero-stats { display: flex; gap: 32px; }
  .stat { display: flex; flex-direction: column; }
  .stat-num { font-size: 22px; font-weight: 800; color: var(--accent); font-family: var(--mono); }
  .stat-label { font-size: 11px; color: var(--muted); font-weight: 600; letter-spacing: 1px; }

  /* CONTENT */
  .content { padding: 40px 60px; max-width: 900px; }

  /* MODULE HEADER */
  .module-header { margin-bottom: 32px; }
  .module-tag { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; font-family: var(--mono); margin-bottom: 12px; }
  .module-h2 { font-size: 30px; font-weight: 800; line-height: 1.2; margin-bottom: 10px; }
  .module-desc { font-size: 14px; color: var(--muted); line-height: 1.7; }

  /* STEPS */
  .steps { display: flex; flex-direction: column; gap: 4px; margin-bottom: 32px; }
  .step-indicator {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-radius: 8px; cursor: pointer; transition: all 0.15s;
    border: 1px solid transparent;
  }
  .step-indicator:hover { background: var(--surface2); }
  .step-indicator.active { background: rgba(0,229,255,0.07); border-color: rgba(0,229,255,0.2); }
  .step-indicator.done { opacity: 0.7; }
  .step-num {
    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; flex-shrink: 0; font-family: var(--mono);
    border: 1.5px solid var(--border); color: var(--muted); background: var(--surface);
  }
  .step-num.active { border-color: var(--accent); color: var(--accent); background: rgba(0,229,255,0.1); }
  .step-num.done { border-color: var(--green); color: var(--green); background: rgba(16,185,129,0.1); }
  .step-info { flex: 1; }
  .step-title { font-size: 13px; font-weight: 700; }
  .step-subtitle { font-size: 11px; color: var(--muted); }

  /* STEP CONTENT */
  .step-content {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    overflow: hidden; margin-bottom: 32px;
  }
  .step-content-header {
    padding: 20px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
  }
  .step-content-body { padding: 24px; }

  .step-title-large { font-size: 18px; font-weight: 800; }

  /* CONCEPT BOX */
  .concept-box {
    background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
    border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;
  }
  .concept-box-title { font-size: 11px; font-weight: 700; color: var(--accent2); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; font-family: var(--mono); }
  .concept-box p { font-size: 13px; color: #a0aec0; line-height: 1.7; }

  /* TIP BOX */
  .tip-box {
    background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25);
    border-radius: 8px; padding: 14px 18px; margin: 16px 0; display: flex; gap: 10px;
  }
  .tip-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .tip-box p { font-size: 12px; color: #d4a853; line-height: 1.6; }

  /* CODE BLOCK */
  .code-block {
    background: #050810; border: 1px solid var(--border); border-radius: 10px;
    overflow: hidden; margin: 16px 0; position: relative;
  }
  .code-header {
    background: #0d1117; padding: 10px 16px; display: flex; align-items: center;
    justify-content: space-between; border-bottom: 1px solid var(--border);
  }
  .code-filename { font-size: 11px; font-weight: 700; color: var(--muted); font-family: var(--mono); display: flex; align-items: center; gap: 6px; }
  .code-dots { display: flex; gap: 5px; }
  .code-dot { width: 10px; height: 10px; border-radius: 50%; }
  .code-copy {
    background: var(--surface2); border: 1px solid var(--border); color: var(--muted);
    padding: 4px 10px; border-radius: 5px; font-size: 10px; cursor: pointer; font-family: var(--mono);
    transition: all 0.15s; font-weight: 700;
  }
  .code-copy:hover { border-color: var(--accent); color: var(--accent); }
  .code-copy.copied { border-color: var(--green); color: var(--green); }
  pre {
    padding: 20px; overflow-x: auto; font-family: var(--mono);
    font-size: 12px; line-height: 1.8; color: #a8d8ff;
  }
  .kw { color: #c792ea; } .str { color: #c3e88d; } .cmt { color: #546e7a; font-style: italic; }
  .num { color: #f78c6c; } .key { color: #82aaff; } .val { color: #eeffff; }
  .hl { background: rgba(0,229,255,0.07); display: block; margin: 0 -20px; padding: 0 20px; }

  /* TERMINAL */
  .terminal {
    background: #020409; border: 1px solid #1a2640; border-radius: 10px; overflow: hidden; margin: 16px 0;
  }
  .term-header { background: #0d1117; padding: 8px 14px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #1a2640; }
  .term-title { font-size: 11px; color: var(--muted); font-family: var(--mono); }
  .term-body { padding: 16px; font-family: var(--mono); font-size: 12px; line-height: 1.9; }
  .t-prompt { color: var(--accent); }
  .t-cmd { color: #eeffff; }
  .t-out { color: #546e7a; }
  .t-success { color: var(--green); }
  .t-error { color: var(--red); }

  /* STEP NAV */
  .step-nav { display: flex; gap: 12px; align-items: center; }
  .btn {
    padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer;
    font-family: var(--sans); font-size: 13px; font-weight: 700; transition: all 0.15s;
    display: flex; align-items: center; gap: 8px;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent2), #6d28d9); color: #fff;
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(124,58,237,0.4); }
  .btn-secondary { background: var(--surface2); border: 1px solid var(--border); color: var(--text); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-success { background: linear-gradient(135deg, #059669, #10b981); color: #fff; }
  .btn-success:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(16,185,129,0.4); }

  /* QUIZ */
  .quiz-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
    padding: 24px; margin-bottom: 16px;
  }
  .quiz-q { font-size: 15px; font-weight: 700; margin-bottom: 16px; line-height: 1.5; }
  .quiz-q .q-num { color: var(--accent); font-family: var(--mono); font-size: 12px; display: block; margin-bottom: 6px; }
  .quiz-options { display: flex; flex-direction: column; gap: 8px; }
  .quiz-opt {
    padding: 12px 16px; border-radius: 8px; border: 1.5px solid var(--border);
    cursor: pointer; font-size: 13px; transition: all 0.15s; display: flex; align-items: center; gap: 10px;
    background: var(--surface);
  }
  .quiz-opt:hover { border-color: var(--accent); background: rgba(0,229,255,0.05); }
  .quiz-opt.selected { border-color: var(--accent2); background: rgba(124,58,237,0.1); }
  .quiz-opt.correct { border-color: var(--green); background: rgba(16,185,129,0.1); color: var(--green); }
  .quiz-opt.wrong { border-color: var(--red); background: rgba(239,68,68,0.1); color: var(--red); }
  .quiz-opt-letter {
    width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--muted);
    display: flex; align-items: center; justify-content: center; font-size: 11px;
    font-weight: 700; flex-shrink: 0; font-family: var(--mono);
  }
  .quiz-explain {
    background: rgba(0,229,255,0.05); border: 1px solid rgba(0,229,255,0.15);
    border-radius: 8px; padding: 14px 16px; margin-top: 12px; font-size: 12px;
    color: #a0aec0; line-height: 1.7;
  }
  .quiz-explain strong { color: var(--accent); }
  .score-display {
    text-align: center; padding: 40px 20px;
  }
  .score-big { font-size: 64px; font-weight: 800; font-family: var(--mono); margin-bottom: 8px; }
  .score-label { font-size: 14px; color: var(--muted); margin-bottom: 24px; }

  /* ARCHITECTURE */
  .arch-diagram {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 28px; margin: 20px 0; position: relative;
  }
  .arch-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 12px 0; }
  .arch-box {
    border-radius: 8px; padding: 10px 16px; font-size: 12px; font-weight: 700;
    font-family: var(--mono); text-align: center; border: 1.5px solid; min-width: 110px;
  }
  .arch-box.aws { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.08); }
  .arch-box.eso { border-color: var(--accent2); color: var(--accent2); background: rgba(124,58,237,0.08); }
  .arch-box.k8s { border-color: var(--accent); color: var(--accent); background: rgba(0,229,255,0.08); }
  .arch-box.pod { border-color: var(--green); color: var(--green); background: rgba(16,185,129,0.08); }
  .arch-box.tf { border-color: #818cf8; color: #818cf8; background: rgba(129,140,248,0.08); }
  .arch-arrow { color: var(--muted); font-size: 18px; }
  .arch-label { font-size: 10px; color: var(--muted); text-align: center; margin-top: 4px; font-family: var(--mono); }

  /* CHECKLIST */
  .checklist { margin: 16px 0; display: flex; flex-direction: column; gap: 8px; }
  .check-item {
    display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px;
    border-radius: 8px; background: var(--surface2); border: 1px solid var(--border);
    cursor: pointer; transition: all 0.15s;
  }
  .check-item:hover { border-color: var(--accent); }
  .check-item.checked { border-color: var(--green); background: rgba(16,185,129,0.06); }
  .check-box {
    width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid var(--muted);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
    font-size: 11px; transition: all 0.15s;
  }
  .check-item.checked .check-box { background: var(--green); border-color: var(--green); color: #fff; }
  .check-text { font-size: 13px; line-height: 1.5; }
  .check-item.checked .check-text { color: var(--muted); text-decoration: line-through; }

  /* TABS */
  .tabs { display: flex; gap: 2px; background: var(--surface2); border-radius: 8px; padding: 3px; margin-bottom: 16px; }
  .tab {
    flex: 1; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.15s; text-align: center; color: var(--muted);
  }
  .tab.active { background: var(--surface); color: var(--text); }

  /* BREADCRUMB */
  .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 12px; color: var(--muted); }
  .bc-sep { color: var(--border); }
  .bc-current { color: var(--text); font-weight: 600; }

  /* MODULE CARD */
  .module-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .module-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 22px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  }
  .module-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  }
  .module-card.m0::before { background: linear-gradient(90deg, var(--accent2), var(--accent)); }
  .module-card.m1::before { background: linear-gradient(90deg, #f59e0b, #f97316); }
  .module-card.m2::before { background: linear-gradient(90deg, #3b82f6, var(--accent2)); }
  .module-card.m3::before { background: linear-gradient(90deg, var(--green), #06b6d4); }
  .module-card.m4::before { background: linear-gradient(90deg, #ec4899, var(--accent2)); }
  .module-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
  .mc-icon { font-size: 28px; margin-bottom: 12px; }
  .mc-num { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: var(--muted); font-family: var(--mono); margin-bottom: 6px; }
  .mc-title { font-size: 15px; font-weight: 800; margin-bottom: 6px; }
  .mc-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
  .mc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
  .mc-steps { font-size: 11px; color: var(--muted); font-family: var(--mono); }
  .mc-badge { font-size: 10px; padding: 3px 8px; border-radius: 10px; font-weight: 700; }
  .mc-badge.aws { background: rgba(245,158,11,0.15); color: #f59e0b; }
  .mc-badge.azure { background: rgba(59,130,246,0.15); color: #3b82f6; }
  .mc-badge.core { background: rgba(124,58,237,0.15); color: var(--accent2); }
  .mc-badge.cicd { background: rgba(236,72,153,0.15); color: #ec4899; }
  .mc-badge.quiz { background: rgba(0,229,255,0.15); color: var(--accent); }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
  .pulse { animation: pulse 2s infinite; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 0.3s ease; }
`;

// ── DATA ────────────────────────────────────────────────────────────────────

const MODULES = [
  {
    id: 0, icon: "🧭", title: "Why External Secrets?", tag: "CORE",
    badgeClass: "core", desc: "Understand the problem before the tools. Why K8s native secrets aren't enough.",
    steps: ["The Problem", "Architecture Overview", "Tools We'll Use", "Prerequisites"],
  },
  {
    id: 1, icon: "🔐", title: "AWS Secrets Manager + ESO", tag: "AWS",
    badgeClass: "aws", desc: "Provision secrets with Terraform, deploy External Secrets Operator, sync to pods.",
    steps: ["Provision AWS SM", "Deploy ESO via Terraform", "Create ExternalSecret", "Mount into Pod", "Verify It Works"],
  },
  {
    id: 2, icon: "☁️", title: "Azure Key Vault + CSI Driver", tag: "AZURE",
    badgeClass: "azure", desc: "Use the Secrets Store CSI Driver with Azure Key Vault and workload identity.",
    steps: ["Provision Key Vault", "Install CSI Driver", "SecretProviderClass", "Mount as Volume", "Env Var Injection"],
  },
  {
    id: 3, icon: "🔄", title: "Secret Rotation", tag: "CORE",
    badgeClass: "core", desc: "Automate rotation in AWS SM, configure ESO refreshInterval, zero-downtime rotation.",
    steps: ["Rotation Basics", "AWS Rotation Lambda", "ESO refreshInterval", "Watch Rotation Live", "No-Restart Pattern"],
  },
  {
    id: 4, icon: "🚀", title: "CI/CD Integration", tag: "CICD",
    badgeClass: "cicd", desc: "GitHub Actions pipeline: Terraform apply, ESO deploy, secrets never touch logs.",
    steps: ["OIDC Auth (No Keys!)", "Terraform in CI", "Deploy Pipeline", "Secret Hygiene"],
  },
];

// ── STEP CONTENT DATA ───────────────────────────────────────────────────────

const STEP_CONTENT = {
  "0-0": {
    title: "The Problem with Native K8s Secrets",
    concept: "Kubernetes Secrets are just base64-encoded — not encrypted at rest by default. They're stored in etcd. If etcd is compromised, all secrets are exposed. Worse: how do you rotate them? How do you audit access? How does your CI/CD inject them without hardcoding?",
    body: `In interviews, when someone says "just use a K8s Secret", the senior engineer in the room hears:
• No rotation strategy
• No audit trail  
• Probably stored in Git somewhere
• No centralized control

External secret managers solve all of this. Your app gets a clean K8s secret interface — but the source of truth lives in AWS Secrets Manager or Azure Key Vault, with full rotation, IAM, and audit logging.`,
    tip: "💡 Interview answer: 'We use K8s secrets as a projection layer — the source of truth is in AWS Secrets Manager, synced by the External Secrets Operator.' This immediately signals production experience.",
    terminal: null,
    code: null,
  },
  "0-1": {
    title: "Architecture Overview",
    concept: "Before writing any code, understand the data flow. Terraform provisions infrastructure. The operator runs in-cluster and polls the secret manager. K8s gets a synced Secret object. Your pod reads it normally — it never knows where it came from.",
    body: "Here's the full data flow you'll build:",
    arch: true,
    tip: "💡 The beauty: your app code never changes. It reads env vars or a volume mount. The secret plumbing is entirely infra-layer.",
    code: null,
  },
  "0-2": {
    title: "Tools We'll Use",
    concept: "Each tool in the stack has a specific job. Understanding why each tool exists is what interviewers want to hear — not just that you used them.",
    body: `**Terraform** — Provisions AWS Secrets Manager / Azure Key Vault, IAM roles, and installs operators via Helm provider. Infrastructure as Code means secret infrastructure is reviewable and repeatable.

**External Secrets Operator (ESO)** — A Kubernetes controller that watches ExternalSecret CRDs and syncs them into native K8s secrets from your secret store. Polls on a configurable interval.

**Secrets Store CSI Driver** — Alternative approach (Azure-native). Mounts secrets directly as files using the Container Storage Interface. Also supports env var sync.

**GitHub Actions + OIDC** — CI/CD that authenticates to AWS/Azure using short-lived tokens — zero long-lived credentials stored anywhere.`,
    tip: "⚠️ ESO vs CSI Driver: ESO is cloud-agnostic and creates K8s Secrets. CSI Driver mounts as volumes and is more Azure-native. You might use both in a polycloud environment.",
  },
  "0-3": {
    title: "Prerequisites — Get Your Environment Ready",
    concept: "Complete these before any lab steps. Tick each one off as you go.",
    checklist: [
      "kubectl installed (v1.25+)",
      "Terraform installed (v1.5+)",
      "AWS CLI configured (aws configure) OR Azure CLI (az login)",
      "kind or minikube running locally",
      "Helm installed (v3.10+)",
      "GitHub account + repo for CI/CD module",
      "Clone the companion repo: git clone https://github.com/yourusername/k8s-secrets-lab",
    ],
    tip: "💡 For the AWS labs you can use the free tier. Create a dedicated IAM user with least-privilege permissions — we'll show you exactly which permissions you need.",
    code: {
      filename: "terminal",
      lang: "bash",
      content: `<span class="t-prompt">$</span> <span class="t-cmd">kind create cluster --name secrets-lab</span>
<span class="t-success">✓ Cluster created successfully</span>

<span class="t-prompt">$</span> <span class="t-cmd">kubectl cluster-info</span>
<span class="t-success">Kubernetes control plane is running at https://127.0.0.1:xxxxx</span>

<span class="t-prompt">$</span> <span class="t-cmd">terraform --version</span>
<span class="t-success">Terraform v1.7.0</span>

<span class="t-prompt">$</span> <span class="t-cmd">helm version --short</span>
<span class="t-success">v3.14.0+gc4e7485</span>`,
    },
  },
  "1-0": {
    title: "Step 1: Provision AWS Secrets Manager with Terraform",
    concept: "We use Terraform to create the secret in AWS SM. This means it's version-controlled, reviewable, and reproducible. Never create secrets manually in the console — that's not auditable.",
    code: {
      filename: "terraform/aws-secret.tf",
      lang: "hcl",
      content: `<span class="kw">resource</span> <span class="str">"aws_secretsmanager_secret"</span> <span class="str">"app_db"</span> {
  <span class="key">name</span>                    = <span class="str">"prod/myapp/database"</span>
  <span class="key">description</span>             = <span class="str">"Database credentials for myapp"</span>
  <span class="key">recovery_window_in_days</span> = <span class="num">7</span>

  <span class="key">tags</span> = {
    <span class="key">Environment</span> = <span class="str">"prod"</span>
    <span class="key">ManagedBy</span>   = <span class="str">"terraform"</span>
  }
}

<span class="kw">resource</span> <span class="str">"aws_secretsmanager_secret_version"</span> <span class="str">"app_db"</span> {
  <span class="key">secret_id</span> = <span class="val">aws_secretsmanager_secret.app_db.id</span>
  <span class="key">secret_string</span> = <span class="val">jsonencode</span>({
    <span class="key">username</span> = <span class="str">"dbadmin"</span>
    <span class="key">password</span> = <span class="str">"super-secure-password-123"</span>
    <span class="key">host</span>     = <span class="str">"rds.example.com"</span>
  })
}

<span class="cmt"># IAM role for ESO to read this secret (IRSA)</span>
<span class="kw">resource</span> <span class="str">"aws_iam_role"</span> <span class="str">"eso_role"</span> {
  <span class="key">name</span> = <span class="str">"eso-secrets-reader"</span>
  <span class="key">assume_role_policy</span> = <span class="val">data.aws_iam_policy_document.eso_assume.json</span>
}

<span class="kw">resource</span> <span class="str">"aws_iam_role_policy"</span> <span class="str">"eso_policy"</span> {
  <span class="key">role</span> = <span class="val">aws_iam_role.eso_role.name</span>
  <span class="key">policy</span> = <span class="val">jsonencode</span>({
    Version = <span class="str">"2012-10-17"</span>
    Statement = [{
      Effect   = <span class="str">"Allow"</span>
      Action   = [<span class="str">"secretsmanager:GetSecretValue"</span>,
                  <span class="str">"secretsmanager:DescribeSecret"</span>]
      Resource = <span class="val">aws_secretsmanager_secret.app_db.arn</span>
    }]
  })
}`,
    },
    tip: "⚠️ We use IRSA (IAM Roles for Service Accounts) — ESO authenticates as a K8s ServiceAccount that's bound to an IAM Role. No access keys stored anywhere.",
    terminal: `<span class="t-prompt">$</span> <span class="t-cmd">cd terraform && terraform init</span>
<span class="t-success">✓ Initialized. Plugins installed.</span>

<span class="t-prompt">$</span> <span class="t-cmd">terraform plan</span>
<span class="t-out">Plan: 4 to add, 0 to change, 0 to destroy.</span>

<span class="t-prompt">$</span> <span class="t-cmd">terraform apply -auto-approve</span>
<span class="t-success">✓ aws_secretsmanager_secret.app_db: Created</span>
<span class="t-success">✓ aws_iam_role.eso_role: Created</span>
<span class="t-success">Apply complete! Resources: 4 added.</span>`,
  },
  "1-1": {
    title: "Step 2: Deploy External Secrets Operator via Terraform Helm Provider",
    concept: "ESO is a Kubernetes controller. We install it via Helm — and we do that in Terraform using the helm_release resource. This keeps ESO installation in your IaC, not a manual kubectl command.",
    code: {
      filename: "terraform/eso.tf",
      lang: "hcl",
      content: `<span class="kw">resource</span> <span class="str">"helm_release"</span> <span class="str">"external_secrets"</span> {
  <span class="key">name</span>             = <span class="str">"external-secrets"</span>
  <span class="key">repository</span>       = <span class="str">"https://charts.external-secrets.io"</span>
  <span class="key">chart</span>            = <span class="str">"external-secrets"</span>
  <span class="key">namespace</span>        = <span class="str">"external-secrets"</span>
  <span class="key">create_namespace</span> = <span class="kw">true</span>
  <span class="key">version</span>          = <span class="str">"0.9.11"</span>

  <span class="kw">set</span> {
    <span class="key">name</span>  = <span class="str">"serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"</span>
    <span class="key">value</span> = <span class="val">aws_iam_role.eso_role.arn</span>
  }

  <span class="kw">set</span> {
    <span class="key">name</span>  = <span class="str">"installCRDs"</span>
    <span class="key">value</span> = <span class="str">"true"</span>
  }
}

<span class="cmt"># ClusterSecretStore — tells ESO WHERE to get secrets from</span>
<span class="kw">resource</span> <span class="str">"kubectl_manifest"</span> <span class="str">"secret_store"</span> {
  <span class="key">depends_on</span> = [<span class="val">helm_release.external_secrets</span>]
  <span class="key">yaml_body</span> = <span class="val"><<-YAML</span>
    apiVersion: external-secrets.io/v1beta1
    kind: ClusterSecretStore
    metadata:
      name: aws-secrets-manager
    spec:
      provider:
        aws:
          service: SecretsManager
          region: us-east-1
          auth:
            jwt:
              serviceAccountRef:
                name: external-secrets
                namespace: external-secrets
  YAML
}`,
    },
    tip: "💡 ClusterSecretStore is cluster-wide. SecretStore is namespace-scoped. Use ClusterSecretStore for shared infrastructure secrets across teams.",
    terminal: `<span class="t-prompt">$</span> <span class="t-cmd">terraform apply</span>
<span class="t-success">✓ helm_release.external_secrets: Created</span>
<span class="t-success">✓ kubectl_manifest.secret_store: Created</span>

<span class="t-prompt">$</span> <span class="t-cmd">kubectl get pods -n external-secrets</span>
<span class="t-success">NAME                               READY   STATUS    RESTARTS
external-secrets-xxx-yyy           1/1     Running   0
external-secrets-webhook-xxx-yyy   1/1     Running   0</span>`,
  },
  "1-2": {
    title: "Step 3: Create an ExternalSecret Resource",
    concept: "ExternalSecret is the CRD that ESO watches. It tells ESO 'go fetch THIS key from the secret store, and put it into THIS K8s secret'. This is the core glue.",
    code: {
      filename: "k8s/external-secret.yaml",
      lang: "yaml",
      content: `<span class="key">apiVersion</span>: <span class="val">external-secrets.io/v1beta1</span>
<span class="key">kind</span>: <span class="val">ExternalSecret</span>
<span class="key">metadata</span>:
  <span class="key">name</span>: <span class="val">app-db-secret</span>
  <span class="key">namespace</span>: <span class="val">default</span>
<span class="key">spec</span>:
  <span class="cmt">  # How often ESO re-syncs from AWS SM</span>
  <span class="key">refreshInterval</span>: <span class="val">1h</span>

  <span class="key">secretStoreRef</span>:
    <span class="key">name</span>: <span class="val">aws-secrets-manager</span>
    <span class="key">kind</span>: <span class="val">ClusterSecretStore</span>

  <span class="cmt">  # The K8s Secret that will be created/updated</span>
  <span class="key">target</span>:
    <span class="key">name</span>: <span class="val">myapp-database-creds</span>
    <span class="key">creationPolicy</span>: <span class="val">Owner</span>

  <span class="key">data</span>:
    <span class="cmt">    # Map AWS SM JSON keys → K8s Secret keys</span>
    - <span class="key">secretKey</span>: <span class="val">DB_USERNAME</span>
      <span class="key">remoteRef</span>:
        <span class="key">key</span>: <span class="val">prod/myapp/database</span>
        <span class="key">property</span>: <span class="val">username</span>
    - <span class="key">secretKey</span>: <span class="val">DB_PASSWORD</span>
      <span class="key">remoteRef</span>:
        <span class="key">key</span>: <span class="val">prod/myapp/database</span>
        <span class="key">property</span>: <span class="val">password</span>`,
    },
    tip: "💡 creationPolicy: Owner means ESO owns this K8s Secret — if you delete the ExternalSecret, the K8s Secret is also deleted. This prevents orphaned secrets.",
    terminal: `<span class="t-prompt">$</span> <span class="t-cmd">kubectl apply -f k8s/external-secret.yaml</span>
<span class="t-success">externalsecret.external-secrets.io/app-db-secret created</span>

<span class="t-prompt">$</span> <span class="t-cmd">kubectl get externalsecret app-db-secret</span>
<span class="t-success">NAME            STORE                  REFRESH   STATUS   READY
app-db-secret   aws-secrets-manager    1h        Valid    True</span>

<span class="t-prompt">$</span> <span class="t-cmd">kubectl get secret myapp-database-creds</span>
<span class="t-success">NAME                     TYPE     DATA   AGE
myapp-database-creds     Opaque   2      5s</span>`,
  },
  "1-3": {
    title: "Step 4: Mount the Secret into a Pod",
    concept: "Your app never knows about ESO or AWS SM. It just reads env vars or a mounted file. This is the beauty of this pattern — zero app-layer changes.",
    code: {
      filename: "k8s/deployment.yaml",
      lang: "yaml",
      content: `<span class="key">apiVersion</span>: <span class="val">apps/v1</span>
<span class="key">kind</span>: <span class="val">Deployment</span>
<span class="key">metadata</span>:
  <span class="key">name</span>: <span class="val">myapp</span>
<span class="key">spec</span>:
  <span class="key">replicas</span>: <span class="num">2</span>
  <span class="key">selector</span>:
    <span class="key">matchLabels</span>:
      <span class="key">app</span>: <span class="val">myapp</span>
  <span class="key">template</span>:
    <span class="key">spec</span>:
      <span class="key">containers</span>:
        - <span class="key">name</span>: <span class="val">myapp</span>
          <span class="key">image</span>: <span class="val">myapp:latest</span>

          <span class="cmt">          # Option A: inject as env vars</span>
          <span class="key">envFrom</span>:
            - <span class="key">secretRef</span>:
                <span class="key">name</span>: <span class="val">myapp-database-creds</span>

          <span class="cmt">          # Option B: mount as a file</span>
          <span class="key">volumeMounts</span>:
            - <span class="key">name</span>: <span class="val">db-secret-vol</span>
              <span class="key">mountPath</span>: <span class="val">/etc/secrets</span>
              <span class="key">readOnly</span>: <span class="kw">true</span>

      <span class="key">volumes</span>:
        - <span class="key">name</span>: <span class="val">db-secret-vol</span>
          <span class="key">secret</span>:
            <span class="key">secretName</span>: <span class="val">myapp-database-creds</span>`,
    },
    tip: "⚠️ Env vars vs volume mounts: Env vars are simpler but don't update without a pod restart. Volume mounts update automatically when the K8s Secret changes (after kubelet sync). For rotation, volume mounts are preferred.",
    terminal: `<span class="t-prompt">$</span> <span class="t-cmd">kubectl apply -f k8s/deployment.yaml</span>
<span class="t-prompt">$</span> <span class="t-cmd">kubectl exec -it deploy/myapp -- env | grep DB_</span>
<span class="t-success">DB_USERNAME=dbadmin
DB_PASSWORD=super-secure-password-123</span>`,
  },
  "1-4": {
    title: "Step 5: Verify Everything Works",
    concept: "Always verify the full chain: AWS SM → ESO → K8s Secret → Pod. Check each layer.",
    terminal: `<span class="t-prompt">$</span> <span class="t-cmd">aws secretsmanager get-secret-value --secret-id prod/myapp/database</span>
<span class="t-success">{ "SecretString": "{\"username\":\"dbadmin\",\"password\":\"...\"}" }</span>

<span class="t-prompt">$</span> <span class="t-cmd">kubectl get externalsecret app-db-secret -o jsonpath='{.status.conditions}'</span>
<span class="t-success">[{"message":"Secret was synced","reason":"SecretSynced","status":"True","type":"Ready"}]</span>

<span class="t-prompt">$</span> <span class="t-cmd">kubectl describe secret myapp-database-creds</span>
<span class="t-success">Name:         myapp-database-creds
Type:         Opaque
Data:         DB_PASSWORD: 26 bytes
              DB_USERNAME: 7 bytes</span>

<span class="t-prompt">$</span> <span class="t-cmd">kubectl exec deploy/myapp -- env | grep DB</span>
<span class="t-success">DB_USERNAME=dbadmin
DB_PASSWORD=super-secure-password-123</span>
<span class="t-success">✓ Full chain verified!</span>`,
    tip: "💡 'Secret was synced' in the ExternalSecret status is your green flag. If you see a SecretSyncedError, check IAM permissions first — 90% of the time that's the issue.",
  },
  "3-0": {
    title: "Step 1: Secret Rotation — Why It Matters",
    concept: "Rotation is not optional in production. If a secret is leaked, rotation limits the blast radius. In interviews, not knowing rotation patterns is a red flag at senior level.",
    body: `**Two rotation patterns:**

**Active rotation** — The secret value changes on a schedule. AWS SM handles this via a Lambda function that rotates the underlying credential (e.g., changes the DB password in both the DB and the secret).

**Passive refresh** — The app re-reads the secret periodically. ESO's refreshInterval does this. Even if the secret changes, ESO will pick it up on the next poll.

**The challenge:** If your app reads a secret at startup and caches it, rotation does nothing until the pod restarts. The solution is volume mounts (auto-updated by kubelet) or an app that periodically re-reads secrets.`,
    tip: "💡 Interview question: 'How does your app handle secret rotation without downtime?' The answer is: volume mounts + app reads from disk on each request (not just at startup). For env var-based apps, a graceful rolling restart triggered by a controller like Reloader.",
  },
  "3-2": {
    title: "Step 3: ESO refreshInterval — The Sync Heartbeat",
    concept: "refreshInterval controls how often ESO polls your secret manager and updates the K8s Secret. This is separate from how often your app reads the secret.",
    code: {
      filename: "k8s/external-secret-rotation.yaml",
      lang: "yaml",
      content: `<span class="key">apiVersion</span>: <span class="val">external-secrets.io/v1beta1</span>
<span class="key">kind</span>: <span class="val">ExternalSecret</span>
<span class="key">metadata</span>:
  <span class="key">name</span>: <span class="val">app-db-secret</span>
<span class="key">spec</span>:
  <span class="cmt">  # Poll every 5 minutes (use 1h in production for stable secrets)</span>
  <span class="key">refreshInterval</span>: <span class="val">5m</span>

  <span class="key">target</span>:
    <span class="key">name</span>: <span class="val">myapp-database-creds</span>
    <span class="cmt">    # Trigger pod restart when secret changes (needs Reloader)</span>
    <span class="key">template</span>:
      <span class="key">metadata</span>:
        <span class="key">annotations</span>:
          <span class="key">secret.reloader.stakater.com/reload</span>: <span class="str">"true"</span>
  <span class="key">data</span>:
    - <span class="key">secretKey</span>: <span class="val">DB_PASSWORD</span>
      <span class="key">remoteRef</span>:
        <span class="key">key</span>: <span class="val">prod/myapp/database</span>
        <span class="key">property</span>: <span class="val">password</span>`,
    },
    tip: "💡 Stakater Reloader watches K8s Secrets/ConfigMaps and triggers rolling restarts when they change. It's the missing piece for env-var-based apps. Install it: helm install reloader stakater/reloader",
    terminal: `<span class="t-prompt">$</span> <span class="t-cmd"># Manually trigger a rotation to test</span>
<span class="t-prompt">$</span> <span class="t-cmd">aws secretsmanager rotate-secret --secret-id prod/myapp/database</span>
<span class="t-success">{ "VersionId": "abc123...", "Name": "prod/myapp/database" }</span>

<span class="t-prompt">$</span> <span class="t-cmd"># Watch ESO pick it up</span>
<span class="t-prompt">$</span> <span class="t-cmd">kubectl get externalsecret app-db-secret -w</span>
<span class="t-out">STATUS   READY   AGE</span>
<span class="t-out">Valid    True    5m</span>
<span class="t-success">Valid    True    10m   <-- re-synced after refreshInterval</span>

<span class="t-prompt">$</span> <span class="t-cmd"># Reloader triggers a rolling restart automatically</span>
<span class="t-prompt">$</span> <span class="t-cmd">kubectl rollout status deployment/myapp</span>
<span class="t-success">deployment "myapp" successfully rolled out</span>`,
  },
};

const QUIZ_QUESTIONS = [
  {
    q: "An interviewer asks: 'What's wrong with storing secrets in Kubernetes Secrets?' What's the best answer?",
    opts: [
      "They are not supported in production clusters",
      "They are base64-encoded (not encrypted) and stored unencrypted in etcd by default, with no audit trail or rotation mechanism",
      "Kubernetes Secrets are perfectly fine and widely used in production",
      "They can only store strings, not binary data",
    ],
    correct: 1,
    explain: "K8s Secrets are base64 encoded — not encrypted. Unless you configure encryption at rest for etcd, secrets are stored in plaintext. They also have no built-in rotation, no audit log, and no fine-grained access control like IAM.",
  },
  {
    q: "What is the role of the External Secrets Operator (ESO)?",
    opts: [
      "It replaces AWS Secrets Manager entirely",
      "It encrypts Kubernetes Secrets using AES-256",
      "It watches ExternalSecret CRDs and syncs secrets from external stores (AWS SM, Azure KV) into K8s native Secrets",
      "It prevents pods from reading environment variables",
    ],
    correct: 2,
    explain: "ESO is a Kubernetes controller that bridges external secret stores and K8s native secrets. Your pods read K8s Secrets normally — ESO handles the syncing in the background.",
  },
  {
    q: "Your app uses env vars to read DB credentials. You rotate the secret in AWS SM. When will the running pod see the new value?",
    opts: [
      "Immediately — ESO pushes the update in real time",
      "Never — env vars are immutable",
      "After ESO's refreshInterval syncs the K8s Secret AND the pod is restarted (rolling or manual)",
      "After 24 hours — AWS SM has a 24h propagation delay",
    ],
    correct: 2,
    explain: "Env vars are set at pod startup and don't change while the pod is running. ESO will update the K8s Secret after refreshInterval, but the pod needs to restart to pick up new env vars. Solutions: use volume mounts (kubelet updates these) or Stakater Reloader for automatic rolling restarts.",
  },
  {
    q: "How does ESO authenticate to AWS Secrets Manager in a production EKS cluster?",
    opts: [
      "Using an AWS Access Key stored in a K8s Secret",
      "Using IRSA (IAM Roles for Service Accounts) — a K8s ServiceAccount is annotated with an IAM Role ARN",
      "Using the cluster's root AWS account credentials",
      "ESO doesn't need authentication — it uses the VPC's network policies",
    ],
    correct: 1,
    explain: "IRSA (IAM Roles for Service Accounts) lets K8s pods assume IAM roles without any long-lived credentials. The ESO ServiceAccount is annotated with eks.amazonaws.com/role-arn, and AWS STS validates the K8s OIDC token to issue temporary credentials.",
  },
  {
    q: "What is a ClusterSecretStore vs a SecretStore in ESO?",
    opts: [
      "ClusterSecretStore is for AWS, SecretStore is for Azure",
      "ClusterSecretStore is cluster-scoped (all namespaces can reference it), SecretStore is namespace-scoped",
      "They are identical — just different naming conventions",
      "ClusterSecretStore stores more secrets (higher capacity)",
    ],
    correct: 1,
    explain: "ClusterSecretStore is accessible from all namespaces — good for shared infrastructure secrets. SecretStore is scoped to a single namespace — better for team isolation. Use SecretStore when different teams should have different IAM roles for their secrets.",
  },
  {
    q: "In CI/CD, how should your pipeline authenticate to AWS to run Terraform (never storing long-lived keys)?",
    opts: [
      "Store AWS_ACCESS_KEY_ID in GitHub Secrets",
      "Hardcode credentials in the Terraform provider block",
      "Use GitHub Actions OIDC — GitHub exchanges a short-lived OIDC token for AWS temporary credentials via STS AssumeRoleWithWebIdentity",
      "Use the EC2 instance profile of the GitHub Actions runner",
    ],
    correct: 2,
    explain: "GitHub Actions OIDC allows AWS to trust GitHub as an identity provider. Your workflow requests a token from GitHub's OIDC endpoint, exchanges it with AWS STS for temporary credentials. Zero long-lived keys stored anywhere. This is the modern standard.",
  },
  {
    q: "A pod is crashing because it can't read its database password. What's your debugging order?",
    opts: [
      "Restart the pod and hope it works",
      "Check: (1) AWS SM secret exists, (2) ExternalSecret status is 'Ready: True', (3) K8s Secret exists and has data, (4) Pod's ServiceAccount has the right permissions",
      "Delete the ExternalSecret and recreate it",
      "Check the Kubernetes version compatibility first",
    ],
    correct: 1,
    explain: "Always debug the chain from source to pod: verify the secret exists in AWS SM → check ESO ExternalSecret status (kubectl describe externalsecret) → verify the K8s Secret was created → check pod env/volumes → check IRSA/IAM permissions. 90% of issues are IAM-related.",
  },
  {
    q: "What is the refreshInterval in an ExternalSecret, and what tradeoff does it create?",
    opts: [
      "How often Kubernetes restarts the pod — shorter intervals mean more downtime",
      "How often ESO polls the external secret store — shorter intervals = faster rotation pickup but more API calls and potential rate limiting",
      "How long AWS SM caches the secret before invalidating it",
      "The TTL of the K8s Secret before it auto-deletes",
    ],
    correct: 1,
    explain: "refreshInterval controls ESO's polling frequency. Too short (e.g., 1m) and you'll hammer AWS SM's API and risk rate limits. Too long (e.g., 24h) and a rotated secret takes a long time to propagate. A good default is 1h for stable secrets, 5m for secrets that rotate frequently.",
  },
];

// ── COMPONENTS ──────────────────────────────────────────────────────────────

function CodeBlock({ filename, content, lang }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const isTerminal = lang === "bash" || filename === "terminal";
  return (
    <div className="code-block">
      <div className="code-header">
        <div className="code-filename">
          {!isTerminal && <><span className="code-dot" style={{background:"#ff5f56"}}></span><span className="code-dot" style={{background:"#ffbd2e"}}></span><span className="code-dot" style={{background:"#27c93f"}}></span></>}
          {isTerminal && <span style={{color:"#27c93f"}}>●</span>}
          <span style={{marginLeft: 8}}>{filename}</span>
        </div>
        <button className={`code-copy${copied ? " copied" : ""}`} onClick={handleCopy}>
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      {isTerminal
        ? <div className="term-body" dangerouslySetInnerHTML={{__html: content}} />
        : <pre dangerouslySetInnerHTML={{__html: content}} />
      }
    </div>
  );
}

function ArchDiagram() {
  return (
    <div className="arch-diagram fade-in">
      <div style={{textAlign:"center",marginBottom:20,fontSize:12,color:"var(--muted)",fontFamily:"var(--mono)",letterSpacing:1}}>DATA FLOW</div>
      <div className="arch-row">
        <div><div className="arch-box tf">Terraform</div><div className="arch-label">provisions</div></div>
        <div className="arch-arrow">→</div>
        <div><div className="arch-box aws">AWS Secrets Manager</div><div className="arch-label">source of truth</div></div>
      </div>
      <div style={{textAlign:"center",margin:"8px 0",color:"var(--muted)",fontSize:20}}>↓</div>
      <div className="arch-row">
        <div><div className="arch-box eso">External Secrets Operator</div><div className="arch-label">polls every refreshInterval</div></div>
        <div className="arch-arrow">→</div>
        <div><div className="arch-box k8s">K8s Secret</div><div className="arch-label">synced copy</div></div>
      </div>
      <div style={{textAlign:"center",margin:"8px 0",color:"var(--muted)",fontSize:20}}>↓</div>
      <div className="arch-row">
        <div><div className="arch-box pod">Your Pod</div><div className="arch-label">reads env vars / volume</div></div>
        <div className="arch-arrow">↔</div>
        <div style={{background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.1)",borderRadius:8,padding:"10px 16px",fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>App reads<br/>DB_PASSWORD<br/>like normal</div>
      </div>
      <div style={{marginTop:20,padding:"12px 16px",background:"rgba(16,185,129,0.06)",borderRadius:8,border:"1px solid rgba(16,185,129,0.15)",textAlign:"center",fontSize:12,color:"#10b981"}}>
        ✓ App code has zero knowledge of AWS SM or ESO
      </div>
    </div>
  );
}

function CheckList({ items }) {
  const [checked, setChecked] = useState([]);
  const toggle = (i) => setChecked(c => c.includes(i) ? c.filter(x=>x!==i) : [...c,i]);
  return (
    <div className="checklist">
      {items.map((item, i) => (
        <div key={i} className={`check-item${checked.includes(i) ? " checked" : ""}`} onClick={() => toggle(i)}>
          <div className="check-box">{checked.includes(i) ? "✓" : ""}</div>
          <div className="check-text">{item}</div>
        </div>
      ))}
      {checked.length === items.length && (
        <div style={{textAlign:"center",padding:"12px",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:8,color:"var(--green)",fontWeight:700,fontSize:13}}>
          🚀 All prerequisites ready! Let's go.
        </div>
      )}
    </div>
  );
}

function StepContentPanel({ moduleId, stepIdx }) {
  const key = `${moduleId}-${stepIdx}`;
  const content = STEP_CONTENT[key];
  if (!content) return (
    <div className="step-content fade-in">
      <div className="step-content-header">
        <div className="step-title-large">{MODULES[moduleId]?.steps[stepIdx]}</div>
      </div>
      <div className="step-content-body">
        <div className="concept-box">
          <div className="concept-box-title">Coming Soon</div>
          <p>This step content is part of the full lab. Clone the companion repo for the complete hands-on content for this step.</p>
        </div>
        <div className="tip-box">
          <span className="tip-icon">📦</span>
          <p><strong>git clone https://github.com/yourusername/k8s-secrets-lab</strong> — the full repo has every step, all Terraform code, K8s manifests, and GitHub Actions workflows.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="step-content fade-in">
      <div className="step-content-header">
        <div>
          <div style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",marginBottom:4}}>STEP {stepIdx + 1}</div>
          <div className="step-title-large">{content.title}</div>
        </div>
      </div>
      <div className="step-content-body">
        {content.concept && (
          <div className="concept-box">
            <div className="concept-box-title">💡 The Concept</div>
            <p>{content.concept}</p>
          </div>
        )}
        {content.arch && <ArchDiagram />}
        {content.body && (
          <p style={{fontSize:13,color:"#a0aec0",lineHeight:1.8,marginBottom:16,whiteSpace:"pre-line"}}>{content.body}</p>
        )}
        {content.checklist && <CheckList items={content.checklist} />}
        {content.code && <CodeBlock filename={content.code.filename} content={content.code.content} lang={content.code.lang} />}
        {content.terminal && (
          <div className="terminal">
            <div className="term-header">
              <span className="code-dot" style={{background:"#ff5f56",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>
              <span className="code-dot" style={{background:"#ffbd2e",width:10,height:10,borderRadius:"50%",display:"inline-block",marginLeft:5}}></span>
              <span className="code-dot" style={{background:"#27c93f",width:10,height:10,borderRadius:"50%",display:"inline-block",marginLeft:5}}></span>
              <span className="term-title" style={{marginLeft:12}}>terminal</span>
            </div>
            <div className="term-body" dangerouslySetInnerHTML={{__html: content.terminal}} />
          </div>
        )}
        {content.tip && (
          <div className="tip-box">
            <span className="tip-icon">{content.tip.startsWith("⚠️") ? "⚠️" : "💡"}</span>
            <p>{content.tip.replace("⚠️ ","").replace("💡 ","")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizModule() {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [done, setDone] = useState(false);

  const select = (qi, oi) => {
    if (revealed[qi]) return;
    setAnswers(a => ({...a, [qi]: oi}));
    setRevealed(r => ({...r, [qi]: true}));
  };

  const score = Object.keys(revealed).filter(qi => answers[qi] === QUIZ_QUESTIONS[qi].correct).length;

  if (done) {
    const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    const color = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--accent3)" : "var(--red)";
    return (
      <div className="score-display fade-in">
        <div className="score-big" style={{color}}>{score}/{QUIZ_QUESTIONS.length}</div>
        <div className="score-label">{pct >= 80 ? "🏆 Interview Ready!" : pct >= 60 ? "📚 Getting There — Review the weak spots" : "🔄 Keep Studying — Re-do the labs"}</div>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:28}}>
          {pct >= 80 ? "You can confidently discuss K8s secrets patterns in any senior interview." : "Go back through the modules and focus on the concepts you missed."}
        </div>
        <button className="btn btn-primary" onClick={() => { setAnswers({}); setRevealed({}); setDone(false); }}>
          Retry Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="module-header">
        <div className="module-tag">🎯 INTERVIEW PREP</div>
        <div className="module-h2">Interview Question Bank</div>
        <div className="module-desc">These are real questions from senior/staff engineer interviews. Select an answer — explanation reveals immediately.</div>
      </div>
      <div style={{background:"rgba(0,229,255,0.06)",border:"1px solid rgba(0,229,255,0.15)",borderRadius:8,padding:"12px 16px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:13,color:"var(--accent)",fontFamily:"var(--mono)",fontWeight:700}}>{Object.keys(revealed).length}/{QUIZ_QUESTIONS.length} answered</span>
        <span style={{fontSize:13,color:"var(--green)",fontFamily:"var(--mono)",fontWeight:700}}>{score} correct</span>
      </div>
      {QUIZ_QUESTIONS.map((q, qi) => (
        <div key={qi} className="quiz-card">
          <div className="quiz-q">
            <span className="q-num">Q{qi + 1} of {QUIZ_QUESTIONS.length}</span>
            {q.q}
          </div>
          <div className="quiz-options">
            {q.opts.map((opt, oi) => {
              let cls = "quiz-opt";
              if (revealed[qi]) {
                if (oi === q.correct) cls += " correct";
                else if (answers[qi] === oi) cls += " wrong";
              } else if (answers[qi] === oi) cls += " selected";
              return (
                <div key={oi} className={cls} onClick={() => select(qi, oi)}>
                  <div className="quiz-opt-letter">{["A","B","C","D"][oi]}</div>
                  {opt}
                </div>
              );
            })}
          </div>
          {revealed[qi] && (
            <div className="quiz-explain">
              <strong>{answers[qi] === q.correct ? "✓ Correct! " : "✗ Not quite. "}</strong>{q.explain}
            </div>
          )}
        </div>
      ))}
      {Object.keys(revealed).length === QUIZ_QUESTIONS.length && (
        <div style={{textAlign:"center",marginTop:16}}>
          <button className="btn btn-success" onClick={() => setDone(true)}>
            See My Score →
          </button>
        </div>
      )}
    </div>
  );
}

function HomeView({ onSelect }) {
  return (
    <div className="fade-in">
      <div className="hero">
        <div className="hero-tag">⚡ HANDS-ON LAB</div>
        <h1>K8s Secrets<br/><span>Done Right</span></h1>
        <p className="hero-desc">
          Stop getting caught off guard in interviews. Learn exactly how to connect Kubernetes pods to AWS Secrets Manager and Azure Key Vault — with Terraform, rotation, and CI/CD. Hands-on, step-by-step.
        </p>
        <div className="hero-stats">
          <div className="stat"><div className="stat-num">5</div><div className="stat-label">Modules</div></div>
          <div className="stat"><div className="stat-num">20+</div><div className="stat-label">Hands-on Steps</div></div>
          <div className="stat"><div className="stat-num">8</div><div className="stat-label">Interview Qs</div></div>
          <div className="stat"><div className="stat-num">0</div><div className="stat-label">Handwaving</div></div>
        </div>
      </div>
      <div className="content">
        <div style={{marginBottom:28}}>
          <div className="module-tag" style={{fontSize:12,color:"var(--muted)",fontFamily:"var(--mono)",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>LEARNING PATH</div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:8}}>Pick a Module to Start</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>Each module builds on the last — but you can jump to any topic you need.</div>
        </div>
        <div className="module-cards">
          {MODULES.map((m, i) => (
            <div key={i} className={`module-card m${i}`} onClick={() => onSelect(i)}>
              <div className="mc-icon">{m.icon}</div>
              <div className="mc-num">MODULE {String(i+1).padStart(2,"0")}</div>
              <div className="mc-title">{m.title}</div>
              <div className="mc-desc">{m.desc}</div>
              <div className="mc-footer">
                <div className="mc-steps">{m.steps.length} steps</div>
                <div className={`mc-badge ${m.badgeClass}`}>{m.tag}</div>
              </div>
            </div>
          ))}
          <div className="module-card m4" style={{cursor:"pointer"}} onClick={() => onSelect("quiz")}>
            <div className="mc-icon">🎯</div>
            <div className="mc-num">BONUS</div>
            <div className="mc-title">Interview Question Bank</div>
            <div className="mc-desc">8 real interview questions with instant feedback and detailed explanations.</div>
            <div className="mc-footer">
              <div className="mc-steps">8 questions</div>
              <div className="mc-badge quiz">QUIZ</div>
            </div>
          </div>
        </div>
        <div style={{marginTop:32,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:24}}>
          <div style={{fontSize:12,fontWeight:700,letterSpacing:2,color:"var(--muted)",fontFamily:"var(--mono)",marginBottom:12}}>GET THE LAB FILES</div>
          <div className="terminal">
            <div className="term-header">
              <span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>terminal</span>
            </div>
            <div className="term-body">
              <div><span className="t-prompt">$</span> <span className="t-cmd">git clone https://github.com/yourusername/k8s-secrets-lab</span></div>
              <div><span className="t-prompt">$</span> <span className="t-cmd">cd k8s-secrets-lab</span></div>
              <div><span className="t-prompt">$</span> <span className="t-cmd">ls</span></div>
              <div><span className="t-out">terraform/  k8s/  .github/workflows/  README.md</span></div>
            </div>
          </div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>Clone first, then follow along. Every code snippet in this lab has a matching file in the repo.</div>
        </div>
      </div>
    </div>
  );
}

function ModuleView({ moduleId, onBack, completedSteps, onCompleteStep }) {
  const [activeStep, setActiveStep] = useState(0);
  const m = MODULES[moduleId];

  return (
    <div className="fade-in">
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"16px 60px",display:"flex",alignItems:"center",gap:16}}>
        <button className="btn btn-secondary" onClick={onBack} style={{padding:"7px 14px",fontSize:12}}>← Back</button>
        <div className="breadcrumb" style={{marginBottom:0}}>
          <span>Lab</span><span className="bc-sep">›</span><span className="bc-current">{m.title}</span>
        </div>
      </div>
      <div className="content" style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:32,paddingTop:32}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"var(--muted)",fontFamily:"var(--mono)",marginBottom:12}}>STEPS</div>
          <div className="steps">
            {m.steps.map((s, i) => {
              const done = completedSteps[`${moduleId}-${i}`];
              return (
                <div key={i} className={`step-indicator${activeStep===i?" active":""}${done?" done":""}`} onClick={() => setActiveStep(i)}>
                  <div className={`step-num${activeStep===i?" active":""}${done?" done":""}`}>{done ? "✓" : i+1}</div>
                  <div className="step-info">
                    <div className="step-title" style={{fontSize:12}}>{s}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:16,padding:"12px 14px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.1)",borderRadius:8}}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--accent)",fontFamily:"var(--mono)",marginBottom:4}}>PROGRESS</div>
            <div style={{fontSize:13,fontWeight:700}}>
              {Object.keys(completedSteps).filter(k=>k.startsWith(`${moduleId}-`)).length}/{m.steps.length} done
            </div>
          </div>
        </div>
        <div>
          <StepContentPanel moduleId={moduleId} stepIdx={activeStep} />
          <div className="step-nav" style={{marginTop:16}}>
            {activeStep > 0 && (
              <button className="btn btn-secondary" onClick={() => setActiveStep(s => s-1)}>← Prev</button>
            )}
            {!completedSteps[`${moduleId}-${activeStep}`] && (
              <button className="btn btn-success" onClick={() => { onCompleteStep(moduleId, activeStep); }}>
                ✓ Mark Complete
              </button>
            )}
            {activeStep < m.steps.length - 1 && (
              <button className="btn btn-primary" onClick={() => setActiveStep(s => s+1)}>
                Next Step →
              </button>
            )}
            {activeStep === m.steps.length - 1 && (
              <button className="btn btn-primary" onClick={onBack}>
                ← Back to Modules
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("home");
  const [activeModule, setActiveModule] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});

  const totalSteps = MODULES.reduce((a,m) => a + m.steps.length, 0);
  const doneCount = Object.keys(completedSteps).length;
  const pct = Math.round((doneCount / totalSteps) * 100);

  const handleSelect = (id) => {
    if (id === "quiz") { setView("quiz"); return; }
    setActiveModule(id);
    setView("module");
  };

  const handleCompleteStep = (moduleId, stepIdx) => {
    setCompletedSteps(c => ({...c, [`${moduleId}-${stepIdx}`]: true}));
  };

  const navItems = [
    { label: "Home", icon: "🏠", id: "home" },
    ...MODULES.map((m, i) => ({ label: m.title, icon: m.icon, id: `m${i}`, moduleId: i, badge: null })),
    { label: "Interview Quiz", icon: "🎯", id: "quiz", badge: "NEW" },
  ];

  return (
    <>
      <style>{style}</style>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-badge"><span>K8S SECRETS</span></div>
            <div className="sidebar-title">K8s Secrets Lab</div>
            <div className="sidebar-subtitle">hands-on · terraform · cicd</div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">Navigation</div>
            {navItems.map((item) => {
              const isActive = (item.id === "home" && view === "home") ||
                (item.id === "quiz" && view === "quiz") ||
                (item.moduleId !== undefined && view === "module" && activeModule === item.moduleId);
              const isDone = item.moduleId !== undefined &&
                MODULES[item.moduleId]?.steps.every((_, i) => completedSteps[`${item.moduleId}-${i}`]);
              return (
                <div key={item.id} className={`nav-item${isActive ? " active" : ""}`}
                  onClick={() => item.moduleId !== undefined ? handleSelect(item.moduleId) : item.id === "quiz" ? handleSelect("quiz") : setView("home")}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                  {isDone && <span className="nav-done">✓</span>}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{width:`${pct}%`}}></div>
            </div>
            <div className="progress-text">{doneCount}/{totalSteps} steps complete · {pct}%</div>
          </div>
        </div>

        <div className="main">
          {view === "home" && <HomeView onSelect={handleSelect} />}
          {view === "module" && activeModule !== null && (
            <ModuleView
              moduleId={activeModule}
              onBack={() => setView("home")}
              completedSteps={completedSteps}
              onCompleteStep={handleCompleteStep}
            />
          )}
          {view === "quiz" && (
            <div>
              <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"16px 60px",display:"flex",alignItems:"center",gap:16}}>
                <button className="btn btn-secondary" onClick={() => setView("home")} style={{padding:"7px 14px",fontSize:12}}>← Back</button>
                <div style={{fontSize:13,color:"var(--muted)"}}>Interview Question Bank</div>
              </div>
              <div className="content">
                <QuizModule />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
