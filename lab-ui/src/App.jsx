import { useState, useRef, useEffect, useMemo } from "react";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const G = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#080c18;--s1:#0f1623;--s2:#151e2e;--bd:#1c2a3e;
  --ac:#00e5ff;--pu:#7c3aed;--go:#10b981;--wa:#f59e0b;--re:#ef4444;--az:#0078d4;
  --tx:#dde4f0;--mu:#536070;
  --mono:'Space Mono','Courier New',Courier,monospace;
  --sans:'Syne','Segoe UI',system-ui,-apple-system,sans-serif;
}
body{background:var(--bg);color:var(--tx);font-family:var(--sans);min-height:100vh}
.app{display:flex;min-height:100vh}

/* SIDEBAR */
.sb{width:260px;min-height:100vh;background:var(--s1);border-right:1px solid var(--bd);
    display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0;transition:width .2s ease}
.sb.collapsed{width:48px;min-width:48px}
.sb.collapsed .ni-label,.sb.collapsed .ni-tag,.sb.collapsed .sb-sub,.sb.collapsed .sb-title,.sb.collapsed .sb-badge{display:none!important}
.sb.collapsed .sb-logo{padding:12px;text-align:center}
.sb-toggle{position:absolute;top:10px;right:10px;background:var(--s2);border:1px solid var(--bd);
    width:24px;height:24px;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;
    font-size:13px;color:var(--mu);transition:all .15s}
.sb-toggle:hover{color:var(--ac);border-color:var(--ac)}
.sb.collapsed .sb-toggle{right:50%;transform:translateX(50%)}
.sb-logo{padding:22px 18px 14px;border-bottom:1px solid var(--bd)}
.sb-badge{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,var(--pu),var(--ac));
          padding:5px 10px;border-radius:5px;margin-bottom:8px}
.sb-badge span{font-size:13px;font-weight:700;letter-spacing:2px;color:#fff}
.sb-title{font-size:15px;font-weight:800;line-height:1.3}
.sb-sub{font-size:13px;color:var(--mu);margin-top:3px;font-family:var(--mono)}
.sb-nav{padding:10px 0;flex:1}
.sb-sec{padding:8px 18px 3px;font-size:13px;font-weight:700;letter-spacing:2px;color:var(--mu);text-transform:uppercase}
.ni{display:flex;align-items:center;gap:9px;padding:9px 18px;cursor:pointer;transition:all .15s;
    border-left:3px solid transparent;font-size:13px;color:var(--mu)}
.ni:hover{background:var(--s2);color:var(--tx)}
.ni.active{border-left-color:var(--ac);background:rgba(0,229,255,.06);color:var(--ac)}
.ni-icon{font-size:15px;width:18px;text-align:center}
.ni-label{font-weight:600;flex:1}
.ni-tag{font-size:13px;padding:2px 5px;border-radius:8px;font-weight:700;letter-spacing:1px}
.tag-aws{background:rgba(245,158,11,.2);color:var(--wa)}
.tag-aks{background:rgba(0,120,212,.2);color:var(--az)}
.tag-core{background:rgba(124,58,237,.2);color:var(--pu)}
.tag-quiz{background:rgba(0,229,255,.15);color:var(--ac)}
.tag-new{background:var(--pu);color:#fff}
.ni-done{color:var(--go);font-size:13px}
.sb-foot{padding:14px 18px;border-top:1px solid var(--bd)}
.pb-wrap{background:var(--bd);border-radius:3px;height:3px;margin-bottom:5px}
.pb-fill{height:3px;border-radius:3px;background:linear-gradient(90deg,var(--pu),var(--ac));transition:width .5s}
.pb-txt{font-size:13px;color:var(--mu);font-family:var(--mono)}

/* MAIN */
.main{flex:1;overflow-y:auto}

/* HERO */
.hero{background:linear-gradient(135deg,#080c18 0%,#0f1623 60%,#0a1420 100%);
      padding:52px 56px 44px;border-bottom:1px solid var(--bd);position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-40%;right:-5%;width:480px;height:480px;
              background:radial-gradient(circle,rgba(124,58,237,.1) 0%,transparent 70%);pointer-events:none}
.hero::after{content:'';position:absolute;bottom:-30%;left:15%;width:360px;height:360px;
             background:radial-gradient(circle,rgba(0,229,255,.06) 0%,transparent 70%);pointer-events:none}
.hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(0,229,255,.08);
          border:1px solid rgba(0,229,255,.2);padding:4px 11px;border-radius:20px;
          font-size:13px;font-weight:700;color:var(--ac);letter-spacing:1.5px;margin-bottom:18px;font-family:var(--mono)}
.hero h1{font-size:38px;font-weight:800;line-height:1.1;margin-bottom:14px}
.hero h1 span{background:linear-gradient(135deg,var(--ac),var(--pu));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero-desc{font-size:13px;color:var(--mu);max-width:520px;line-height:1.7;margin-bottom:24px}
.hero-stats{display:flex;gap:28px}
.stat-num{font-size:20px;font-weight:800;color:var(--ac);font-family:var(--mono)}
.stat-lbl{font-size:13px;color:var(--mu);font-weight:600;letter-spacing:1px}

/* TRACK PILLS */
/* PATH PILLS (Local vs EKS) */
.path-pills{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.path-pill{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:16px;
  font-size:11px;font-weight:700;letter-spacing:0.5px;font-family:var(--mono)}
.path-pill.local{background:rgba(0,229,255,.08);border:1px solid rgba(0,229,255,.25);color:var(--ac)}
.path-pill.eks{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);color:var(--wa)}
.path-pill.eks-only{background:rgba(245,158,11,.12);border:1px solid var(--wa);color:var(--wa)}

.track-pills{display:flex;gap:10px;margin-bottom:28px}
.pill{padding:8px 18px;border-radius:20px;border:1.5px solid var(--bd);cursor:pointer;
      font-size:13px;font-weight:700;transition:all .15s;display:flex;align-items:center;gap:6px}
.pill:hover{border-color:var(--ac)}
.pill.aws-pill.active{border-color:var(--wa);background:rgba(245,158,11,.08);color:var(--wa)}
.pill.aks-pill.active{border-color:var(--az);background:rgba(0,120,212,.08);color:var(--az)}
.pill.both-pill.active{border-color:var(--ac);background:rgba(0,229,255,.06);color:var(--ac)}

/* CONTENT */
.cnt{padding:36px 52px;max-width:880px}

/* MODULE CARDS */
.mc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.mc{background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:20px;
    cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.mc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.mc.c0::before{background:linear-gradient(90deg,var(--pu),var(--ac))}
.mc.c1::before{background:linear-gradient(90deg,var(--wa),#f97316)}
.mc.c2::before{background:linear-gradient(90deg,var(--az),var(--pu))}
.mc.c3::before{background:linear-gradient(90deg,var(--go),#06b6d4)}
.mc.c4::before{background:linear-gradient(90deg,#ec4899,var(--pu))}
.mc.cq::before{background:linear-gradient(90deg,var(--ac),var(--go))}
.mc:hover{border-color:var(--ac);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.3)}
.mc-icon{font-size:26px;margin-bottom:10px}
.mc-num{font-size:13px;font-weight:700;letter-spacing:2px;color:var(--mu);font-family:var(--mono);margin-bottom:4px}
.mc-title{font-size:14px;font-weight:800;margin-bottom:5px}
.mc-desc{font-size:13px;color:var(--mu);line-height:1.5}
.mc-foot{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.mc-steps{font-size:13px;color:var(--mu);font-family:var(--mono)}

/* STEP LAYOUT */
.step-layout{display:grid;grid-template-columns:200px 1fr;gap:28px;padding-top:28px}
.step-list{display:flex;flex-direction:column;gap:3px}
.si{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:7px;
    cursor:pointer;transition:all .15s;border:1px solid transparent;font-size:13px;color:var(--mu)}
.si:hover{background:var(--s2)}
.si.active{background:rgba(0,229,255,.06);border-color:rgba(0,229,255,.18);color:var(--ac)}
.si.done{opacity:.65}
.sn{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:13px;font-weight:700;flex-shrink:0;font-family:var(--mono);border:1.5px solid var(--bd);
    color:var(--mu);background:var(--s1)}
.sn.active{border-color:var(--ac);color:var(--ac);background:rgba(0,229,255,.08)}
.sn.done{border-color:var(--go);color:var(--go);background:rgba(16,185,129,.08)}
.step-progress{margin-top:14px;padding:11px 13px;background:rgba(0,229,255,.04);
               border:1px solid rgba(0,229,255,.1);border-radius:7px}
.sp-label{font-size:13px;font-weight:700;color:var(--ac);font-family:var(--mono);margin-bottom:3px}
.sp-val{font-size:13px;font-weight:800}

/* STEP CARD */
.sc{background:var(--s1);border:1px solid var(--bd);border-radius:10px;overflow:hidden;margin-bottom:20px}
.sc-hd{padding:18px 22px;border-bottom:1px solid var(--bd);display:flex;align-items:flex-start;gap:12px}
.sc-step-num{font-size:13px;color:var(--mu);font-family:var(--mono);margin-bottom:3px}
.sc-title{font-size:17px;font-weight:800}
.sc-body{padding:22px}

/* CONCEPT */
.concept{background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.18);
         border-radius:7px;padding:14px 18px;margin-bottom:16px}
.concept-lbl{font-size:13px;font-weight:700;color:var(--pu);letter-spacing:1.5px;
             text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)}
.concept p{font-size:13px;color:#9ab;line-height:1.7}

/* PROD THINKING */
.prod{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);
      border-radius:7px;padding:12px 16px;margin:14px 0;display:flex;gap:9px}
.prod-icon{font-size:14px;flex-shrink:0;margin-top:1px}
.prod p{font-size:13px;color:#6ecba4;line-height:1.6}
.prod strong{color:var(--go)}

/* TIP */
.tip{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);
     border-radius:7px;padding:11px 15px;margin:14px 0;display:flex;gap:9px}
.tip p{font-size:13px;color:#c9943a;line-height:1.6}

/* CODE */
.code-wrap{background:#030609;border:1px solid var(--bd);border-radius:8px;overflow:hidden;margin:14px 0}
.code-hd{background:#090e18;padding:9px 14px;display:flex;align-items:center;
         justify-content:space-between;border-bottom:1px solid var(--bd)}
.code-fname{font-size:13px;font-weight:700;color:var(--mu);font-family:var(--mono);
            display:flex;align-items:center;gap:6px}
.dots{display:flex;gap:4px}
.dot{width:9px;height:9px;border-radius:50%}
.copy-btn{background:var(--s2);border:1px solid var(--bd);color:var(--mu);
          padding:3px 9px;border-radius:4px;font-size:13px;cursor:pointer;
          font-family:var(--mono);transition:all .15s;font-weight:700}
.copy-btn:hover{border-color:var(--ac);color:var(--ac)}
.copy-btn.ok{border-color:var(--go);color:var(--go)}
pre{padding:18px;overflow-x:auto;font-family:var(--mono);font-size:13px;line-height:1.9;color:#9dc}
.kw{color:#c792ea}.str{color:#c3e88d}.cm{color:#445a60;font-style:italic}
.num{color:#f78c6c}.key{color:#82aaff}.val{color:#eeffff}.hl{color:#00e5ff}

/* TERMINAL */
.term{background:#020407;border:1px solid #13203a;border-radius:8px;overflow:hidden;margin:14px 0}
.term-hd{background:#080d18;padding:7px 13px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #13203a}
.term-title{font-size:13px;color:var(--mu);font-family:var(--mono)}
.term-body{padding:14px;font-family:var(--mono);font-size:13px;line-height:2}
.t-p{color:var(--ac)}.t-c{color:#eef}.t-o{color:#445a60}.t-s{color:var(--go)}.t-e{color:var(--re)}

/* CHECKLIST */
.cl{display:flex;flex-direction:column;gap:7px;margin:14px 0}
.ci{display:flex;align-items:flex-start;gap:9px;padding:9px 13px;border-radius:7px;
    background:var(--s2);border:1px solid var(--bd);cursor:pointer;transition:all .15s}
.ci:hover{border-color:var(--ac)}
.ci.chk{border-color:var(--go);background:rgba(16,185,129,.05)}
.cb{width:16px;height:16px;border-radius:3px;border:1.5px solid var(--mu);display:flex;
    align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;font-size:13px;transition:all .15s}
.ci.chk .cb{background:var(--go);border-color:var(--go);color:#fff}
.ci-txt{font-size:13px;line-height:1.5}
.ci.chk .ci-txt{color:var(--mu);text-decoration:line-through}
.cl-done{text-align:center;padding:10px;background:rgba(16,185,129,.08);
         border:1px solid rgba(16,185,129,.18);border-radius:7px;color:var(--go);font-weight:700;font-size:13px;margin-top:4px}

/* ARCH */
.arch{background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:24px;margin:16px 0}
.arch-row{display:flex;align-items:center;justify-content:center;gap:12px;margin:10px 0;flex-wrap:wrap}
@media (max-width:900px){.arch-row{flex-direction:column;gap:8px}.aa{transform:none}}
.ab{border-radius:7px;padding:9px 14px;font-size:13px;font-weight:700;font-family:var(--mono);
    text-align:center;border:1.5px solid;min-width:100px}
.ab.aws{border-color:var(--wa);color:var(--wa);background:rgba(245,158,11,.07)}
.ab.aks{border-color:var(--az);color:var(--az);background:rgba(0,120,212,.07)}
.ab.eso{border-color:var(--pu);color:var(--pu);background:rgba(124,58,237,.07)}
.ab.k8s{border-color:var(--ac);color:var(--ac);background:rgba(0,229,255,.07)}
.ab.pod{border-color:var(--go);color:var(--go);background:rgba(16,185,129,.07)}
.ab.tf{border-color:#818cf8;color:#818cf8;background:rgba(129,140,248,.07)}
.aa{color:var(--mu);font-size:16px}
.arch-note{margin-top:16px;padding:10px 14px;background:rgba(16,185,129,.05);
           border:1px solid rgba(16,185,129,.12);border-radius:7px;text-align:center;
           font-size:13px;color:var(--go)}

/* STEP NAV */
.step-nav{display:flex;gap:10px;align-items:center;margin-top:14px}
.btn{padding:9px 18px;border-radius:7px;border:none;cursor:pointer;font-family:var(--sans);
     font-size:13px;font-weight:700;transition:all .15s;display:flex;align-items:center;gap:7px}
.btn-p{background:linear-gradient(135deg,var(--pu),#6d28d9);color:#fff}
.btn-p:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(124,58,237,.35)}
.btn-s{background:var(--s2);border:1px solid var(--bd);color:var(--tx)}
.btn-s:hover{border-color:var(--ac);color:var(--ac)}
.btn-g{background:linear-gradient(135deg,#059669,var(--go));color:#fff}
.btn-g:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(16,185,129,.35)}

/* QUIZ */
.qcard{background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:20px;margin-bottom:14px}
.q-num{font-size:13px;color:var(--mu);font-family:var(--mono);display:block;margin-bottom:5px}
.q-text{font-size:14px;font-weight:700;margin-bottom:14px;line-height:1.5}
.q-opts{display:flex;flex-direction:column;gap:7px}
.qo{padding:11px 15px;border-radius:7px;border:1.5px solid var(--bd);cursor:pointer;
    font-size:13px;transition:all .15s;display:flex;align-items:center;gap:9px;background:var(--s1)}
.qo:hover{border-color:var(--ac);background:rgba(0,229,255,.04)}
.qo.correct{border-color:var(--go);background:rgba(16,185,129,.08);color:var(--go)}
.qo.wrong{border-color:var(--re);background:rgba(239,68,68,.08);color:var(--re)}
.ql{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--mu);display:flex;
    align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;font-family:var(--mono)}
.q-explain{background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.12);
           border-radius:7px;padding:12px 15px;margin-top:10px;font-size:13px;color:#8ab;line-height:1.7}
.q-explain strong{color:var(--ac)}
.score-wrap{text-align:center;padding:36px 20px}
.score-big{font-size:60px;font-weight:800;font-family:var(--mono);margin-bottom:6px}
.score-lbl{font-size:13px;color:var(--mu);margin-bottom:22px}
.quiz-prog{background:rgba(0,229,255,.05);border:1px solid rgba(0,229,255,.12);
           border-radius:7px;padding:10px 14px;margin-bottom:20px;display:flex;
           align-items:center;justify-content:space-between}
.quiz-prog-bar{height:6px;background:var(--bd);border-radius:3px;overflow:hidden;flex:1;max-width:120px;margin:0 12px}
.quiz-prog-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--pu),var(--ac));transition:width .4s ease}
.qcard{transition:transform .2s ease,box-shadow .2s ease}
.qcard.revealed .qo{cursor:default}
.qcard.revealed .qo:not(.correct):not(.wrong){opacity:.6}
.q-explain{animation:fadeIn .3s ease}
.quiz-dots{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:16px}
.quiz-dot{width:8px;height:8px;border-radius:50%;background:var(--bd);transition:background .2s}
.quiz-dot.answered{background:var(--go)}
.quiz-dot.wrong{background:var(--re)}
.quiz-dot.current{box-shadow:0 0 0 2px var(--ac);background:var(--ac)}
.score-celebration{font-size:48px;margin-bottom:8px;animation:fadeIn .5s ease}
.score-breakdown{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0;justify-content:center}
.score-wrong{background:rgba(239,68,68,.15);color:var(--re);padding:4px 10px;border-radius:6px;font-size:13px;font-weight:700;font-family:var(--mono)}
.score-correct{background:rgba(16,185,129,.1);color:var(--go);padding:4px 10px;border-radius:6px;font-size:13px;font-weight:700;font-family:var(--mono)}
.scenario-timer{background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:8px;padding:14px 18px;margin:16px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.scenario-timer-txt{font-size:13px;color:var(--mu);font-family:var(--mono)}
.scenario-timer-num{font-size:18px;font-weight:800;font-family:var(--mono);color:var(--ac)}
.scenario-timer.ready .scenario-timer-num{color:var(--go)}
.scenario-reveal-btn{padding:10px 20px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:700;background:var(--s2);border:1px solid var(--bd);color:var(--mu);transition:all .2s}
.scenario-reveal-btn:disabled{cursor:not-allowed;opacity:.7}
.scenario-reveal-btn:not(:disabled){background:linear-gradient(135deg,var(--pu),#6d28d9);color:#fff;border-color:transparent}
.scenario-reveal-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(124,58,237,.35)}
.scenario-answer{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);border-radius:8px;padding:16px 20px;margin-top:16px;font-size:13px;color:#8ab;line-height:1.75;animation:fadeIn .35s ease}
.scenario-answer strong{color:var(--go)}

/* TOP NAV */
.top-nav{background:var(--s1);border-bottom:1px solid var(--bd);padding:13px 52px;
         display:flex;align-items:center;gap:14px}
.bc{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--mu)}
.bc-cur{color:var(--tx);font-weight:600}

@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fadeIn .25s ease}

@media (max-width:900px){
  .cnt{padding:28px!important}
  .hero{padding:36px 28px 36px!important}
  .mc-grid{grid-template-columns:1fr}
}
@media (max-width:768px){
  .sb{display:none;position:fixed;left:0;top:0;z-index:100;width:260px!important;box-shadow:4px 0 20px rgba(0,0,0,.3)}
  .sb.mobile-open{display:flex}
  .main{width:100%}
  .cnt{padding:20px!important}
  .top-nav{padding:13px 20px}
  .hamburger{display:flex!important}
}
.hamburger{display:none;position:fixed;top:14px;left:14px;z-index:101;width:40px;height:40px;
  align-items:center;justify-content:center;background:var(--s1);border:1px solid var(--bd);
  border-radius:8px;cursor:pointer;color:var(--tx);font-size:20px}
.hamburger:hover{background:var(--s2);border-color:var(--ac)}
`;

// ─── DATA ─────────────────────────────────────────────────────────────────────

const MODULES = [
  { id:0,icon:"🧭",title:"Why External Secrets?",tag:"CORE",tc:"core",
    desc:"The real problem with native K8s secrets — and why it matters in interviews.",
    steps:["The Problem","Architecture","Tools Overview","Prerequisites & Quick Start"],
    stepPaths:["both","both","both","both"] },
  { id:1,icon:"🔐",title:"AWS Secrets Manager + ESO",tag:"AWS",tc:"aws",
    desc:"Terraform provisions it. ESO syncs it. Your pod reads it. Full chain.",
    steps:["Provision in AWS SM","Deploy ESO via Terraform","ExternalSecret manifest","Mount into Pod","Bonus: dataFrom and templating","Verify the chain"],
    stepPaths:["both","both","both","both","both","both"] },
  { id:2,icon:"☁️",title:"Azure Key Vault + AKS",tag:"AKS",tc:"aks",
    desc:"AKS Workload Identity + CSI Driver. Zero credentials stored anywhere.",
    steps:["Provision Key Vault","AKS Workload Identity","CSI Driver + Terraform","SecretProviderClass","Mount & verify"],
    stepPaths:["both","both","both","both","both"] },
  { id:3,icon:"🔄",title:"Secret Rotation",tag:"CORE",tc:"core",
    desc:"Rotate in AWS SM or Azure KV, watch ESO pick it up, zero downtime.",
    steps:["Rotation basics","refreshInterval & polling","Run the rotation script","Env vars vs volume mounts","Reloader pattern"],
    stepPaths:["both","both","both","both","both"] },
  { id:4,icon:"🚀",title:"CI/CD with GitHub Actions",tag:"CORE",tc:"core",
    desc:"Terraform plan on PR, apply on merge. OIDC auth — zero stored credentials.",
    steps:["Why OIDC (not keys)","Trust policy setup","Terraform workflow","Deploy workflow","Secret hygiene in logs"],
    stepPaths:["eks-only","eks-only","eks-only","eks-only","eks-only"] },
  { id:5,icon:"📋",title:"Scenario-based interviews",tag:"CORE",tc:"core",
    desc:"13 real scenario questions senior DevOps/SRE interviewers ask. What they test and strong answers.",
    steps:["Secret exposure incident","Migrate to cloud secret manager","Rotation without downtime","Multi-environment strategy","etcd encryption & compliance","ESO not syncing (AWS)","AKS Workload Identity failure","Zero-downtime rotation design","CI/CD OIDC security review","When NOT to use secret managers","ESO throttling at scale","When ESO goes down","IAM permission boundaries"],
    stepPaths:["both","both","both","both","both","both","both","both","both","both","both","both","both"] },
  { id:6,icon:"🖼️",title:"Full flow recap",tag:"CORE",tc:"core",
    desc:"The complete picture: how secrets are created and consumed, end to end. Start here if you want the big picture first.",
    steps:["The full flow: creation to consumption"],
    stepPaths:["both"] },
];

const STEPS = {
"0-0":{
  title:"The Problem with Native K8s Secrets",
  concept:"K8s Secrets are base64-encoded — not encrypted. Stored in etcd. No rotation. No audit trail. No centralized control.",
  body:`When you say "we use K8s Secrets" in an interview, a senior engineer hears:
• No rotation strategy
• No audit log — who accessed what, when?
• Probably in Git somewhere (base64 is not security)
• No IAM-level access control

External secret managers solve all of this. AWS Secrets Manager and Azure Key Vault give you rotation, auditing, fine-grained IAM, and versioning. Your pods still read a normal K8s Secret — you just stop treating K8s as the source of truth.`,
  prod:"In production teams, native K8s Secrets are used only for non-sensitive config. Anything sensitive — DB passwords, API keys, TLS certs — lives in a secrets manager.",
  tip:"Interview answer: 'K8s Secrets are our sync target, not our source of truth. The source lives in AWS Secrets Manager, synced by the External Secrets Operator.' That one sentence signals production experience.",
},
"0-1":{
  title:"Architecture — The Full Data Flow",
  concept:"Terraform provisions the infra. An operator runs in-cluster and polls the secret manager. K8s gets a synced Secret. Your pod reads it normally — zero app changes.",
  body:`The flow in plain English:

1. Terraform creates the secret in the cloud (AWS Secrets Manager or Azure Key Vault). Terraform does NOT create anything inside Kubernetes.

2. The External Secrets Operator (ESO) runs inside your cluster. It has permission to read from the cloud. When you apply an ExternalSecret YAML, ESO reads the cloud secret and creates a normal Kubernetes Secret (e.g. myapp-database-creds). So: ESO creates the K8s Secret — not Terraform.

3. Your Deployment says "this pod gets env vars and files from the Secret myapp-database-creds." Kubernetes injects that into the pod.

4. Your app just reads process.env and /etc/secrets/. It never talks to AWS or Azure.`,
  items:[
    ["Terraform","Creates the secret in AWS Secrets Manager (or Azure Key Vault). Does NOT create the K8s Secret."],
    ["ExternalSecret (YAML)","Tells ESO: create a K8s Secret named myapp-database-creds from this cloud secret. The target.name in the YAML is the K8s Secret name."],
    ["ESO (External Secrets Operator)","Creates and updates the K8s Secret myapp-database-creds by syncing from the cloud. Runs on refreshInterval (e.g. 1h)."],
    ["Deployment (YAML)","Tells the pod: use envFrom and volume from the Secret myapp-database-creds. The pod consumes what ESO created."],
    ["Your app","Reads env vars and files. Never talks to the cloud."],
  ],
  arch:true,
  prod:"This pattern is called the 'operator model'. You deploy a controller that watches CRDs and reconciles state. It's the same pattern as Cert Manager, Flux, and Argo CD.",
  tip:"Interview shortcut: 'Terraform puts the secret in the safe (AWS SM). ESO is the robot that copies it into a box in the cluster (the K8s Secret). My Deployment says the pod gets the box. My app just reads from the box.'",
},
"0-2":{
  title:"Tools — What Each One Does",
  concept:"Know why each tool exists, not just how to use it. That's what interviews test.",
  items:[
    ["Terraform","Provisions AWS SM / Azure KV, IAM roles, and installs operators via Helm. Secret infrastructure is code — reviewable, repeatable, auditable."],
    ["External Secrets Operator (ESO)","K8s controller that watches ExternalSecret CRDs and syncs them from your secret store into native K8s secrets. Cloud-agnostic."],
    ["Secrets Store CSI Driver — Know It Exists","Mounts cloud secrets as files via the Container Storage Interface. Has providers for AWS, Azure, GCP; standard on AKS, used on EKS too. This lab uses ESO on AWS (cloud-agnostic, creates K8s Secrets for envFrom + volume). Interviewers ask 'ESO vs CSI?' — both are valid; we chose ESO for one pattern across the lab and K8s Secret–first model."],
    ["IRSA / Workload Identity","How ESO/pods authenticate to AWS/Azure without any access keys. K8s ServiceAccount → OIDC token → cloud IAM → temporary credentials."],
    ["GitHub Actions OIDC","CI/CD authenticates to AWS/Azure using short-lived tokens. Zero long-lived credentials stored in GitHub."],
    ["Stakater Reloader","Watches K8s Secrets and triggers rolling restarts when they change. The missing piece for env-var-based apps during rotation."],
    ["Sealed Secrets (Bitnami) — Know It Exists","An alternative pattern: encrypts secrets so they're safe to commit to Git. Unlike ESO, it doesn't sync from an external store — the encrypted secret IS the source of truth. Good for GitOps workflows. Interviewers sometimes ask you to compare ESO vs Sealed Secrets. ESO = external source of truth synced into K8s. Sealed Secrets = encrypted secret lives in Git, decrypted in-cluster. We cover ESO in this lab; know both patterns exist."],
    ["ESO vs CSI Driver — Interview Ready","Two ways to get cloud secrets into pods: (1) ESO syncs into a K8s Secret; pod uses secretRef + volume. (2) Secrets Store CSI Driver mounts files directly (and can sync to a Secret). Both are standard. We use ESO here: one pattern for AWS/Azure/GCP, and apps get a real Secret for envFrom. If asked why not CSI on AWS, say: 'Both exist; this lab chose ESO for cloud-agnostic CRDs and K8s Secret–first so the app can use envFrom and volume the same way.' See docs/ESO-VS-CSI.md in the repo for the full comparison."],
  ],
},
"0-3":{
  title:"Prerequisites — Tick These Off Before Starting",
  checklist:[
    "kubectl installed (v1.25+) — kubectl version --client",
    "Terraform installed (v1.5+) — terraform --version",
    "Helm installed (v3.10+) — helm version --short",
    "kind installed for local cluster — kind version",
    "AWS CLI configured — aws configure (for AWS track)",
    "Azure CLI logged in — az login (for Azure track)",
    "Clone this repo — git clone https://github.com/Osomudeya/k8s-secret-lab",
    "Start local cluster — kind create cluster --name secrets-lab",
  ],
  term:`<span class="t-p">$</span> <span class="t-c">kind create cluster --name secrets-lab</span>
<span class="t-s">✓ Cluster created</span>
<span class="t-p">$</span> <span class="t-c">kubectl cluster-info</span>
<span class="t-s">Kubernetes control plane running at https://127.0.0.1:xxxxx</span>
<span class="t-p">$</span> <span class="t-c">cd k8s-secret-lab && ls</span>
<span class="t-o">lab-ui/  terraform/  k8s/  app/  rotation/  .github/</span>`,
  tip:"You're 2 minutes from the first working secret. The lab-ui is already running — now let's build the real thing.",
},
"1-0":{
  title:"Provision AWS Secrets Manager with Terraform",
  costCallout:"⚠ EKS costs ~$0.16/hr. Run teardown.sh when done.",
  concept:"Create the secret in code, not the console. That makes it reviewable, auditable, and reproducible.",
  code:{file:"terraform/aws/secret.tf",content:`<span class="kw">resource</span> <span class="str">"aws_secretsmanager_secret"</span> <span class="str">"app_db"</span> {
  <span class="key">name</span>                    = <span class="str">"prod/myapp/database"</span>
  <span class="key">description</span>             = <span class="str">"DB creds for myapp — managed by Terraform"</span>
  <span class="key">recovery_window_in_days</span> = <span class="num">7</span>
  <span class="key">tags</span> = { <span class="key">ManagedBy</span> = <span class="str">"terraform"</span>, <span class="key">App</span> = <span class="str">"myapp"</span> }
}

<span class="kw">resource</span> <span class="str">"aws_secretsmanager_secret_version"</span> <span class="str">"app_db"</span> {
  <span class="key">secret_id</span>     = <span class="val">aws_secretsmanager_secret.app_db.id</span>
  <span class="key">secret_string</span> = <span class="val">jsonencode</span>({
    <span class="key">username</span> = <span class="str">"dbadmin"</span>
    <span class="key">password</span> = <span class="str">"initial-password-change-me"</span>
    <span class="key">host</span>     = <span class="str">"rds.lab.example.com"</span>
  })
}`},
  term:`<span class="t-p">$</span> <span class="t-c">cd terraform/aws && terraform init</span>
<span class="t-s">✓ Initialized</span>
<span class="t-p">$</span> <span class="t-c">terraform plan</span>
<span class="t-o">Plan: 4 to add, 0 to change, 0 to destroy</span>
<span class="t-p">$</span> <span class="t-c">terraform apply -auto-approve</span>
<span class="t-s">✓ aws_secretsmanager_secret.app_db: Created
✓ aws_iam_role.eso_role: Created
Apply complete! Resources: 4 added.</span>`,
  prod:"recovery_window_in_days: 7 means accidental deletes have a 7-day recovery window. In production set this to 30. Never set to 0 in production — instant permanent delete.",
},
"1-1":{
  title:"Deploy External Secrets Operator via Terraform",
  concept:"ESO is a K8s controller. Install it via Helm inside Terraform — keeps your entire infra in one place.",
  code:{file:"terraform/aws/eso.tf",content:`<span class="kw">resource</span> <span class="str">"helm_release"</span> <span class="str">"external_secrets"</span> {
  <span class="key">name</span>       = <span class="str">"external-secrets"</span>
  <span class="key">repository</span> = <span class="str">"https://charts.external-secrets.io"</span>
  <span class="key">chart</span>      = <span class="str">"external-secrets"</span>
  <span class="key">namespace</span>  = <span class="str">"external-secrets"</span>
  <span class="key">version</span>    = <span class="str">"0.9.11"</span>
  <span class="key">create_namespace</span> = <span class="kw">true</span>

  <span class="kw">set</span> {
    <span class="key">name</span>  = <span class="str">"serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"</span>
    <span class="key">value</span> = <span class="val">aws_iam_role.eso_role.arn</span>  <span class="cm"># IRSA — no access keys!</span>
  }
  <span class="kw">set</span> { <span class="key">name</span> = <span class="str">"installCRDs"</span>; <span class="key">value</span> = <span class="str">"true"</span> }
}

<span class="kw">resource</span> <span class="str">"kubectl_manifest"</span> <span class="str">"cluster_secret_store"</span> {
  <span class="key">depends_on</span> = [<span class="val">helm_release.external_secrets</span>]
  <span class="key">yaml_body</span> = <span class="val"><<-YAML</span>
    apiVersion: external-secrets.io/v1
    kind: ClusterSecretStore
    metadata:
      name: aws-secrets-manager
    spec:
      provider:
        aws:
          service: SecretsManager
          region: us-east-1
  YAML
}`},
  term:`<span class="t-p">$</span> <span class="t-c">kubectl get pods -n external-secrets</span>
<span class="t-s">NAME                             READY   STATUS    RESTARTS
external-secrets-xxx             1/1     Running   0
external-secrets-webhook-xxx     1/1     Running   0</span>
<span class="t-p">$</span> <span class="t-c">kubectl get clustersecretstore</span>
<span class="t-s">NAME                  AGE   STATUS   CAPABILITIES
aws-secrets-manager   30s   Valid    ReadWrite</span>`,
  prod:"ClusterSecretStore is cluster-wide. Use SecretStore (namespace-scoped) when different teams need different IAM roles for their secrets — better least-privilege isolation.",
},
"1-2":{
  title:"Create the ExternalSecret Resource",
  concept:"ExternalSecret is the CRD that tells ESO: fetch THIS from the store, create THAT K8s Secret. This is the glue.",
  code:{file:"k8s/aws/external-secret.yaml",content:`<span class="key">apiVersion</span>: <span class="val">external-secrets.io/v1</span>
<span class="key">kind</span>: <span class="val">ExternalSecret</span>
<span class="key">metadata</span>:
  <span class="key">name</span>: <span class="val">app-db-secret</span>
<span class="key">spec</span>:
  <span class="key">refreshInterval</span>: <span class="val">1h</span>   <span class="cm"># How often ESO polls AWS SM</span>

  <span class="key">secretStoreRef</span>:
    <span class="key">name</span>: <span class="val">aws-secrets-manager</span>
    <span class="key">kind</span>: <span class="val">ClusterSecretStore</span>

  <span class="key">target</span>:
    <span class="key">name</span>: <span class="val">myapp-database-creds</span>  <span class="cm"># K8s Secret created here</span>
    <span class="key">creationPolicy</span>: <span class="val">Owner</span>    <span class="cm"># ESO owns it — deletes it with ExternalSecret</span>

  <span class="key">data</span>:
    - <span class="key">secretKey</span>: <span class="val">DB_PASSWORD</span>
      <span class="key">remoteRef</span>:
        <span class="key">key</span>: <span class="val">prod/myapp/database</span>  <span class="cm"># secret name in AWS SM</span>
        <span class="key">property</span>: <span class="val">password</span>        <span class="cm"># JSON key inside the secret</span>
    - <span class="key">secretKey</span>: <span class="val">DB_USERNAME</span>
      <span class="key">remoteRef</span>:
        <span class="key">key</span>: <span class="val">prod/myapp/database</span>
        <span class="key">property</span>: <span class="val">username</span>`},
  term:`<span class="t-p">$</span> <span class="t-c">kubectl apply -f k8s/aws/external-secret.yaml</span>
<span class="t-s">externalsecret.external-secrets.io/app-db-secret created</span>
<span class="t-p">$</span> <span class="t-c">kubectl get externalsecret app-db-secret</span>
<span class="t-s">NAME            STORE                 REFRESH   STATUS   READY
app-db-secret   aws-secrets-manager   1h        Valid    True</span>
<span class="t-p">$</span> <span class="t-c">kubectl get secret myapp-database-creds</span>
<span class="t-s">NAME                    TYPE     DATA   AGE
myapp-database-creds    Opaque   2      8s</span>`,
  tip:"If STATUS is not 'Valid', run: kubectl describe externalsecret app-db-secret — the error is always in the conditions. 90% of the time it's an IAM permission missing.",
  prod:"Interview: Terraform does NOT create the K8s Secret myapp-database-creds. ESO creates it when it syncs. The ExternalSecret's spec.target.name is where you define that name. Terraform only creates the secret in AWS; the ExternalSecret YAML (applied with kubectl or GitOps) tells ESO what to create in the cluster.",
},
"1-3":{
  title:"Mount the Secret into Your Pod",
  concept:"Your app doesn't know about ESO or AWS SM. It just reads env vars or files. Zero app-layer changes needed. The Deployment only references the Secret name (myapp-database-creds) — the same name ESO created in the previous step.",
  code:{file:"k8s/aws/deployment.yaml",content:`<span class="key">spec</span>:
  <span class="key">containers</span>:
    - <span class="key">name</span>: <span class="val">myapp</span>
      <span class="key">image</span>: <span class="val">node:18-alpine</span>

      <span class="cm">      # Option A: env vars — simple, but need pod restart on rotation</span>
      <span class="key">envFrom</span>:
        - <span class="key">secretRef</span>:
            <span class="key">name</span>: <span class="val">myapp-database-creds</span>

      <span class="cm">      # Option B: volume mount — updates without pod restart!</span>
      <span class="key">volumeMounts</span>:
        - <span class="key">name</span>: <span class="val">db-secret-vol</span>
          <span class="key">mountPath</span>: <span class="val">/etc/secrets</span>
          <span class="key">readOnly</span>: <span class="kw">true</span>

  <span class="key">volumes</span>:
    - <span class="key">name</span>: <span class="val">db-secret-vol</span>
      <span class="key">secret</span>:
        <span class="key">secretName</span>: <span class="val">myapp-database-creds</span>`},
  prod:"Volume mounts are preferred for rotation because kubelet updates them automatically (~60s after K8s Secret changes). Env vars need a pod restart. For new apps: read from /etc/secrets on each request, not once at startup.",
},
"1-4":{
  title:"Bonus: dataFrom and Secret Templating",
  concept:"dataFrom fetches all keys from one AWS SM secret in a single API call. Templating lets you construct derived values like connection strings.",
  code:{file:"k8s/aws/external-secret-datafrom.yaml",content:`<span class="key">spec</span>:
  <span class="key">dataFrom</span>:
    - <span class="key">extract</span>:
        <span class="key">key</span>: <span class="val">prod/myapp/database</span>
  <span class="key">target</span>:
    <span class="key">name</span>: <span class="val">myapp-database-creds</span>
    <span class="key">template</span>:
      <span class="key">data</span>:
        <span class="key">DATABASE_URL</span>: <span class="str">"postgres://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/{{ .dbname }}"</span>`},
  prod:"In production with 10+ services each reading 5-key secrets, switching from data to dataFrom reduces your AWS SM API calls by 5x. At scale this is the difference between staying in quota and getting throttled.",
},
"1-5":{
  title:"Verify the Full Chain",
  concept:"Always verify every layer: AWS SM → ESO → K8s Secret → Pod. Don't assume — confirm.",
  term:`<span class="t-p">$</span> <span class="t-c">aws secretsmanager get-secret-value --secret-id prod/myapp/database</span>
<span class="t-s">{ "SecretString": "{\"username\":\"dbadmin\",\"password\":\"...\"}" }</span>

<span class="t-p">$</span> <span class="t-c">kubectl get externalsecret app-db-secret -o jsonpath='{.status.conditions[0].message}'</span>
<span class="t-s">Secret was synced</span>

<span class="t-p">$</span> <span class="t-c">kubectl get secret myapp-database-creds -o jsonpath='{.data.DB_PASSWORD}' | base64 -d</span>
<span class="t-s">initial-password-change-me</span>

<span class="t-p">$</span> <span class="t-c">kubectl exec deploy/myapp -- env | grep DB_USERNAME</span>
<span class="t-s">DB_USERNAME=dbadmin</span>

<span class="t-p">$</span> <span class="t-c">curl http://localhost:3000/secrets/env  # via port-forward</span>
<span class="t-s">{ "DB_USERNAME": "dbadmin", "DB_PASSWORD": "**********me" }</span>
<span class="t-s">✅ Full chain verified!</span>`,
  prod:"Never print the raw secret value in production commands or logs. In the verification script (app/server.js) we mask the last 4 chars for exactly this reason.",
},
"2-0":{
  title:"Provision Azure Key Vault with Terraform",
  concept:"Same pattern as AWS — infrastructure as code. Key Vault + AKS Workload Identity replaces AWS SM + IRSA.",
  code:{file:"terraform/azure/keyvault.tf",content:`<span class="kw">resource</span> <span class="str">"azurerm_key_vault"</span> <span class="str">"lab"</span> {
  <span class="key">name</span>                      = <span class="str">"k8s-secrets-lab-kv"</span>
  <span class="key">location</span>                  = <span class="val">azurerm_resource_group.lab.location</span>
  <span class="key">resource_group_name</span>       = <span class="val">azurerm_resource_group.lab.name</span>
  <span class="key">tenant_id</span>                 = <span class="val">data.azurerm_client_config.current.tenant_id</span>
  <span class="key">sku_name</span>                  = <span class="str">"standard"</span>
  <span class="key">enable_rbac_authorization</span> = <span class="kw">true</span>  <span class="cm"># Modern approach over access policies</span>
  <span class="key">soft_delete_retention_days</span> = <span class="num">7</span>
}

<span class="kw">resource</span> <span class="str">"azurerm_key_vault_secret"</span> <span class="str">"db_password"</span> {
  <span class="key">name</span>         = <span class="str">"db-password"</span>
  <span class="key">value</span>        = <span class="str">"initial-password-change-me"</span>
  <span class="key">key_vault_id</span> = <span class="val">azurerm_key_vault.lab.id</span>
}`},
  term:`<span class="t-p">$</span> <span class="t-c">az login</span>
<span class="t-s">✓ Logged in as you@domain.com</span>
<span class="t-p">$</span> <span class="t-c">cd terraform/azure && terraform init && terraform apply</span>
<span class="t-s">✓ azurerm_kubernetes_cluster.lab: Created
✓ azurerm_key_vault.lab: Created
✓ azurerm_key_vault_secret.db_password: Created
Apply complete! Resources: 8 added.</span>`,
  prod:"Use enable_rbac_authorization = true (not access policies). RBAC is auditable, follows least-privilege, and is the recommended approach for new Key Vaults.",
},
"2-1":{
  title:"AKS Workload Identity — How It Works",
  concept:"Workload Identity lets an AKS pod assume an Azure Managed Identity without any credentials. Same concept as AWS IRSA.",
  code:{file:"terraform/azure/workload-identity.tf",content:`<span class="cm"># Managed Identity the pod will assume</span>
<span class="kw">resource</span> <span class="str">"azurerm_user_assigned_identity"</span> <span class="str">"myapp"</span> {
  <span class="key">name</span>                = <span class="str">"myapp-identity"</span>
  <span class="key">resource_group_name</span> = <span class="val">azurerm_resource_group.lab.name</span>
  <span class="key">location</span>            = <span class="val">azurerm_resource_group.lab.location</span>
}

<span class="cm"># Grant identity read access to Key Vault secrets</span>
<span class="kw">resource</span> <span class="str">"azurerm_role_assignment"</span> <span class="str">"myapp_kv_reader"</span> {
  <span class="key">scope</span>                = <span class="val">azurerm_key_vault.lab.id</span>
  <span class="key">role_definition_name</span> = <span class="str">"Key Vault Secrets User"</span>
  <span class="key">principal_id</span>         = <span class="val">azurerm_user_assigned_identity.myapp.principal_id</span>
}

<span class="cm"># Link K8s ServiceAccount → Managed Identity</span>
<span class="kw">resource</span> <span class="str">"azurerm_federated_identity_credential"</span> <span class="str">"myapp"</span> {
  <span class="key">name</span>       = <span class="str">"myapp-federated"</span>
  <span class="key">issuer</span>     = <span class="val">azurerm_kubernetes_cluster.lab.oidc_issuer_url</span>
  <span class="key">subject</span>    = <span class="str">"system:serviceaccount:default:myapp-sa"</span>
  <span class="key">audience</span>   = [<span class="str">"api://AzureADTokenExchange"</span>]
  <span class="key">parent_id</span>  = <span class="val">azurerm_user_assigned_identity.myapp.id</span>
}`},
  prod:"The federated credential subject must exactly match your K8s ServiceAccount: system:serviceaccount:NAMESPACE:SA_NAME. Any mismatch and the pod gets a 403 — always double-check this.",
},
"2-2":{
  title:"Install Secrets Store CSI Driver via Terraform",
  concept:"The CSI Driver mounts Azure Key Vault secrets directly as files into pods. No ESO needed for Azure — the CSI Driver is the native approach.",
  code:{file:"terraform/azure/workload-identity.tf (CSI section)",content:`<span class="kw">resource</span> <span class="str">"helm_release"</span> <span class="str">"secrets_store_csi"</span> {
  <span class="key">name</span>       = <span class="str">"secrets-store-csi-driver"</span>
  <span class="key">repository</span> = <span class="str">"https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts"</span>
  <span class="key">chart</span>      = <span class="str">"secrets-store-csi-driver"</span>
  <span class="key">namespace</span>  = <span class="str">"kube-system"</span>
  <span class="key">version</span>    = <span class="str">"1.4.1"</span>

  <span class="kw">set</span> { <span class="key">name</span> = <span class="str">"syncSecret.enabled"</span>;      <span class="key">value</span> = <span class="str">"true"</span> }
  <span class="kw">set</span> { <span class="key">name</span> = <span class="str">"enableSecretRotation"</span>;  <span class="key">value</span> = <span class="str">"true"</span> }
  <span class="kw">set</span> { <span class="key">name</span> = <span class="str">"rotationPollInterval"</span>;  <span class="key">value</span> = <span class="str">"2m"</span>  }
}`},
  term:`<span class="t-p">$</span> <span class="t-c">kubectl get pods -n kube-system | grep secrets-store</span>
<span class="t-s">secrets-store-csi-driver-xxxxx   3/3   Running   0   90s</span>
<span class="t-p">$</span> <span class="t-c">kubectl get crd | grep secrets-store</span>
<span class="t-s">secretproviderclasses.secrets-store.csi.x-k8s.io</span>`,
  prod:"syncSecret.enabled: true is required to sync KV secrets into K8s Secret objects. Without it, you can only use volume mounts — no env vars.",
},
"2-3":{
  title:"SecretProviderClass — The Azure Glue",
  concept:"SecretProviderClass is the Azure equivalent of ExternalSecret. It tells the CSI driver what to fetch from Key Vault.",
  code:{file:"k8s/azure/secret-provider-class.yaml",content:`<span class="key">apiVersion</span>: <span class="val">secrets-store.csi.x-k8s.io/v1</span>
<span class="key">kind</span>: <span class="val">SecretProviderClass</span>
<span class="key">metadata</span>:
  <span class="key">name</span>: <span class="val">azure-kv-provider</span>
<span class="key">spec</span>:
  <span class="key">provider</span>: <span class="val">azure</span>

  <span class="cm">  # Sync to a K8s Secret — enables env vars</span>
  <span class="key">secretObjects</span>:
    - <span class="key">secretName</span>: <span class="val">myapp-database-creds</span>
      <span class="key">type</span>: <span class="val">Opaque</span>
      <span class="key">data</span>:
        - <span class="key">objectName</span>: <span class="val">db-password</span>
          <span class="key">key</span>: <span class="val">DB_PASSWORD</span>

  <span class="key">parameters</span>:
    <span class="key">clientID</span>:     <span class="str">"MANAGED_IDENTITY_CLIENT_ID"</span>  <span class="cm"># terraform output</span>
    <span class="key">keyvaultName</span>: <span class="str">"k8s-secrets-lab-kv"</span>
    <span class="key">tenantId</span>:     <span class="str">"AZURE_TENANT_ID"</span>
    <span class="key">objects</span>: |
      array:
        - |
          objectName: db-password
          objectType: secret
          objectVersion: ""   <span class="cm"># empty = always latest</span>`},
  tip:"objectVersion: empty string means 'always fetch the latest version'. If you want to pin to a specific version for stability (canary rollouts), put the version GUID here.",
},
"2-4":{
  title:"Deploy + Verify AKS Path",
  concept:"The pod uses a ServiceAccount annotated with the Managed Identity client ID. That's the workload identity handshake.",
  code:{file:"k8s/azure/deployment.yaml (key parts)",content:`<span class="key">apiVersion</span>: <span class="val">v1</span>
<span class="key">kind</span>: <span class="val">ServiceAccount</span>
<span class="key">metadata</span>:
  <span class="key">name</span>: <span class="val">myapp-sa</span>
  <span class="key">annotations</span>:
    <span class="key">azure.workload.identity/client-id</span>: <span class="str">"MANAGED_IDENTITY_CLIENT_ID"</span>
  <span class="key">labels</span>:
    <span class="key">azure.workload.identity/use</span>: <span class="str">"true"</span>
<span class="cm">---</span>
<span class="key">volumes</span>:
  - <span class="key">name</span>: <span class="val">secrets-store</span>
    <span class="key">csi</span>:
      <span class="key">driver</span>: <span class="val">secrets-store.csi.k8s.io</span>
      <span class="key">readOnly</span>: <span class="kw">true</span>
      <span class="key">volumeAttributes</span>:
        <span class="key">secretProviderClass</span>: <span class="val">azure-kv-provider</span>`},
  term:`<span class="t-p">$</span> <span class="t-c">kubectl apply -f k8s/azure/</span>
<span class="t-s">secretproviderclass.secrets-store.csi.x-k8s.io/azure-kv-provider created
serviceaccount/myapp-sa created
deployment.apps/myapp created</span>
<span class="t-p">$</span> <span class="t-c">kubectl get secretproviderclass</span>
<span class="t-s">NAME                AGE
azure-kv-provider   30s</span>
<span class="t-p">$</span> <span class="t-c">kubectl exec deploy/myapp -- env | grep DB_PASSWORD</span>
<span class="t-s">DB_PASSWORD=initial-password-change-me</span>`,
},
"3-0":{
  title:"Secret Rotation — Why It Matters",
  concept:"Rotation limits blast radius. If a credential leaks, rotation means it's only valid until the next rotation cycle.",
  body:`Two things to understand:

1. Rotation in the secret manager — the value changes (AWS SM can do this via Lambda, Azure KV has built-in rotation policies)

2. Propagation to the pod — how does the running pod pick up the new value?

The challenge: if your app reads a secret once at startup and caches it, rotation does nothing until the pod restarts. The solution is either volume mounts (auto-update) or Reloader (triggers rolling restarts on secret change).`,
  tip:"In this lab, the Terraform rotation resource does nothing without a Lambda (we don't define one). To see rotation live, use the test script: bash rotation/test-rotation.sh. It updates the secret in AWS and forces ESO to sync so you can watch volume vs env var behaviour.",
  prod:"Senior engineers ask: 'What's your rotation strategy?' The answer should include: rotation schedule, propagation mechanism, and how you handle the window between rotation and propagation (connection pool drain, retry logic).",
},
"3-1":{
  title:"refreshInterval — ESO's Heartbeat",
  concept:"refreshInterval controls how often ESO polls the secret manager and updates the K8s Secret. Shorter = faster pickup, more API calls.",
  code:{file:"k8s/aws/external-secret.yaml",content:`<span class="key">spec</span>:
  <span class="cm">  # 1h = poll every hour (good for stable secrets)</span>
  <span class="cm">  # 5m = poll every 5 min (for frequently rotated secrets)</span>
  <span class="cm">  # Too short = rate limit risk on AWS SM API</span>
  <span class="key">refreshInterval</span>: <span class="val">1h</span>

  <span class="key">target</span>:
    <span class="key">name</span>: <span class="val">myapp-database-creds</span>
    <span class="key">template</span>:
      <span class="key">metadata</span>:
        <span class="key">annotations</span>:
          <span class="cm">          # Reloader watches this annotation</span>
          <span class="key">secret.reloader.stakater.com/reload</span>: <span class="str">"true"</span>`},
  prod:"Azure CSI Driver has its own rotation poll: rotationPollInterval: 2m set in the Helm values. Default is 2 minutes. For AKS, the pod sees the updated file within 2-3 minutes of a Key Vault secret change.",
},
"3-2":{
  title:"Run the Rotation Script",
  concept:"test-rotation.sh does the whole thing: updates the secret, forces ESO sync, compares env var vs volume mount. Run it and watch the difference. View the script: https://github.com/Osomudeya/k8s-secret-lab/blob/main/rotation/test-rotation.sh",
  term:`<span class="t-p">$</span> <span class="t-c">chmod +x rotation/test-rotation.sh</span>
<span class="t-p">$</span> <span class="t-c">bash rotation/test-rotation.sh</span>

<span class="t-o">📦 Step 1: Current DB_PASSWORD in pod (volume mount):</span>
<span class="t-o">**************me</span>

<span class="t-o">🔄 Step 3: Rotating secret in AWS Secrets Manager...</span>
<span class="t-s">✅ New password set: ***5842</span>

<span class="t-o">⚡ Step 4: Forcing ESO sync...</span>
<span class="t-o">   Waiting 10 seconds...</span>

<span class="t-o">📁 Step 6: DB_PASSWORD from volume mount (NEW value):</span>
<span class="t-s">**************5842   ← updated automatically!</span>

<span class="t-o">🌍 Step 7: DB_PASSWORD from env var (OLD value):</span>
<span class="t-e">**************me     ← still old, needs pod restart</span>

<span class="t-o">────────────────────────────────────────</span>
<span class="t-s">💡 Volume mount updated. Env var needs restart.</span>`,
  tip:"The force-sync trick: annotate the ExternalSecret with a timestamp — kubectl annotate externalsecret app-db-secret force-sync=$(date +%s) --overwrite. ESO detects the annotation change and re-syncs immediately.",
},
"3-3":{
  title:"Env Vars vs Volume Mounts — The Key Difference",
  concept:"This is the most common interview follow-up after you mention rotation. Know both patterns cold.",
  items:[
    ["Env Vars","Set at pod startup. Never change while pod is running. Simple to use. Rotation requires pod restart. Use Reloader to automate this."],
    ["Volume Mounts","kubelet syncs the mounted secret file when the K8s Secret changes (~60s delay). Pod reads the file on each request — no restart needed. Better for rotation."],
    ["Reloader (Stakater)","Watches K8s Secrets and automatically triggers rolling restarts when they change. Best of both worlds for env-var-based apps: helm install reloader stakater/reloader"],
    ["App-level re-read","The cleanest pattern: app reads /etc/secrets/DB_PASSWORD on every DB connection attempt, not just startup. No restart needed, instant rotation pickup."],
  ],
},
"3-4":{
  title:"No-Downtime Rotation Pattern",
  concept:"Zero-downtime rotation requires your app and infra to cooperate. Here's the production pattern.",
  body:`1. Secret manager rotates the value (scheduled or manual)
2. ESO picks it up after refreshInterval (or CSI Driver after rotationPollInterval)
3. K8s Secret is updated
4. Volume mount files update automatically (kubelet, ~60s)
5. For env vars: Reloader detects K8s Secret change, triggers rolling update
6. Rolling update means new pods come up (reading new secret) before old pods go down
7. Result: zero downtime, new credentials in use`,
  prod:"The connection pool problem: if your app has DB connections open with the old password, those stay open even after rotation. The real production pattern is: connection retry logic + short connection lifetimes (pool_timeout: 5m) so connections naturally refresh.",
},
"4-0":{
  title:"Why OIDC Auth (Not Stored Keys)",
  concept:"Storing AWS_ACCESS_KEY_ID in GitHub Secrets is a security smell. If GitHub is compromised, those keys are long-lived. OIDC tokens are short-lived — they expire after 15 minutes.",
  body:`How GitHub Actions OIDC works:

1. Your workflow requests a JWT from GitHub's OIDC provider
2. AWS (or Azure) is configured to trust GitHub's OIDC provider
3. GitHub's JWT is exchanged with AWS STS for temporary credentials (15-min expiry)
4. Your workflow uses those temporary credentials — no stored keys

Setup: one trust policy in AWS IAM, one permission in your repo (id-token: write), and the aws-actions/configure-aws-credentials action handles the rest.`,
  prod:"'We use OIDC for CI authentication' is a strong signal in interviews. It shows you think about supply chain security, not just functionality.",
},
"4-1":{
  title:"GitHub Actions Trust Policy Setup",
  concept:"You need to tell AWS 'trust GitHub as an OIDC provider for this specific repo and branch'.",
  code:{file:"AWS Console / Terraform: IAM Trust Policy",content:`<span class="cm"># In terraform/aws/iam.tf — add this to the assume role policy</span>
{
  <span class="str">"Effect"</span>: <span class="str">"Allow"</span>,
  <span class="str">"Principal"</span>: {
    <span class="str">"Federated"</span>: <span class="str">"arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"</span>
  },
  <span class="str">"Action"</span>: <span class="str">"sts:AssumeRoleWithWebIdentity"</span>,
  <span class="str">"Condition"</span>: {
    <span class="str">"StringEquals"</span>: {
      <span class="str">"token.actions.githubusercontent.com:aud"</span>: <span class="str">"sts.amazonaws.com"</span>
    },
    <span class="str">"StringLike"</span>: {
      <span class="cm">      // Only YOUR repo on main branch can assume this role</span>
      <span class="str">"token.actions.githubusercontent.com:sub"</span>: 
        <span class="str">"repo:Osomudeya/k8s-secret-lab:ref:refs/heads/main"</span>
    }
  }
}`},
  tip:"The StringLike condition scoping to your repo and branch is critical. Without it, any GitHub Actions workflow from any repo could assume your role. Always scope to the exact repo.",
},
"4-2":{
  title:"Terraform CI Workflow",
  concept:"Plan on PR (team reviews before merge), apply on main (automated deployment). No manual terraform apply in production.",
  code:{file:".github/workflows/terraform.yml",content:`<span class="key">permissions</span>:
  <span class="key">id-token</span>: <span class="val">write</span>    <span class="cm"># Required for OIDC</span>
  <span class="key">contents</span>: <span class="val">read</span>
  <span class="key">pull-requests</span>: <span class="val">write</span>  <span class="cm"># Post plan as PR comment</span>

<span class="key">steps</span>:
  - <span class="key">name</span>: <span class="val">Configure AWS credentials (OIDC)</span>
    <span class="key">uses</span>: <span class="val">aws-actions/configure-aws-credentials@v4</span>
    <span class="key">with</span>:
      <span class="key">role-to-assume</span>: <span class="val">\${{ secrets.AWS_ROLE_ARN }}</span>
      <span class="key">aws-region</span>: <span class="val">us-east-1</span>
      <span class="cm">      # No AWS_ACCESS_KEY_ID — that's the point</span>

  - <span class="key">name</span>: <span class="val">Terraform Plan</span>
    <span class="key">run</span>: <span class="val">terraform plan -no-color -out=tfplan</span>

  - <span class="key">name</span>: <span class="val">Terraform Apply (main only)</span>
    <span class="key">if</span>: <span class="val">github.ref == 'refs/heads/main'</span>
    <span class="key">run</span>: <span class="val">terraform apply -auto-approve tfplan</span>`},
  prod:"Post the terraform plan output as a PR comment (see the full workflow). Your team reviews infra changes before they go live — this is standard in mature DevOps teams.",
},
"4-3":{
  title:"Deploy Workflow + Secret Hygiene",
  concept:"The deploy workflow applies K8s manifests after Terraform. Secret hygiene: never print secret values in CI logs.",
  code:{file:".github/workflows/deploy.yml",content:`<span class="key">steps</span>:
  - <span class="key">name</span>: <span class="val">Apply K8s manifests</span>
    <span class="key">run</span>: |
      kubectl apply -f k8s/aws/external-secret.yaml
      kubectl apply -f k8s/aws/deployment.yaml

  - <span class="key">name</span>: <span class="val">Verify — NEVER print raw secrets in CI</span>
    <span class="key">run</span>: |
      <span class="cm">      # Good: check the secret exists and has data</span>
      kubectl get secret myapp-database-creds
      
      <span class="cm">      # Good: confirm env var is SET (not its value)</span>
      kubectl exec deploy/myapp -- sh -c \\
        <span class="str">'[ -n "$DB_PASSWORD" ] && echo "DB_PASSWORD=****SET****"'</span>
      
      <span class="cm">      # NEVER do this in CI:</span>
      <span class="cm">      # kubectl exec deploy/myapp -- env | grep DB_PASSWORD</span>
      <span class="cm">      # ↑ prints the actual value into GitHub Actions logs</span>`},
  prod:"GitHub Actions logs are retained and sometimes shared with support. A secret printed in a log is effectively leaked. Always verify presence, never value.",
},
"4-4":{
  title:"Secret Hygiene Checklist",
  concept:"Production-grade secret hygiene goes beyond just using a secrets manager. These are the habits that separate junior from senior.",
  items:[
    ["Never commit secrets","Even fake/example secrets in README.md train bad habits. Use placeholders: YOUR_SECRET_HERE"],
    ["Never print secrets in logs","CI, app logs, kubectl output — mask always. Our app/server.js masks by default."],
    ["Least-privilege IAM","ESO's IAM role should only read the specific secrets it needs. Not secretsmanager:* on *."],
    ["Rotate regularly","Monthly minimum for DB passwords. Weekly for highly sensitive credentials. Daily for tokens."],
    ["Audit access","AWS CloudTrail + CloudWatch for SM API calls. Azure Monitor for Key Vault. Know who accessed what."],
    ["Short-lived CI credentials","OIDC only. 15-minute expiry. No exceptions for 'convenience'."],
  ],
},
"5-0":{
  title:"Scenario 1: Kubernetes Secret Exposure Incident",
  concept:"Your security team discovers that database credentials in a K8s Secret were exposed through a misconfigured pod in production.",
  body:`Question: What steps would you take immediately, and how would you prevent this from happening again?

What interviewers are testing: Secret rotation strategy, RBAC and least privilege, pod security practices, external secret management.`,
  scenarioAnswer:"Strong answer: Immediate credential rotation in the DB and in the secret store. Audit logs (API server, etcd access) to see who accessed what. Review RBAC — who can read Secrets? Avoid mounting secrets broadly (use specific keys, read-only). Consider moving to external secret store (AWS SM / Azure Key Vault) so K8s is not the source of truth. Enable encryption at rest for etcd.",
  prod:"In production, 'secret exposed' means assume compromise. Rotate first, then investigate. Document and fix the misconfiguration (e.g. overly broad volume mount, RBAC).",
},
"5-1":{
  title:"Scenario 2: Migrating from K8s Secrets to Cloud Secret Manager",
  concept:"Your org stores all secrets as Kubernetes Secrets. Leadership wants to migrate to AWS Secrets Manager or Azure Key Vault.",
  body:`Question: How would you design and implement this migration with minimal downtime?

What interviewers are testing: External Secrets Operator / CSI driver knowledge, migration planning, zero-downtime thinking, secret sync patterns.`,
  scenarioAnswer:"Strong answer: Inventory existing K8s Secrets. Store each secret in the cloud manager first (Terraform or manual). Deploy ESO (or Secrets Store CSI for Azure) and create ExternalSecrets (or SecretProviderClasses) that sync from the cloud into K8s Secrets with the same names. Roll out gradually (canary or per namespace). Validate apps still work. Remove old K8s Secrets after cutover. Apps keep reading the same Secret name — no app code changes.",
  prod:"Key insight: if the K8s Secret name and keys stay the same, the Deployment and app don't change. Only the source of the Secret changes (manual → ESO sync from cloud).",
},
"5-2":{
  title:"Scenario 3: Secret Rotation Without Downtime",
  concept:"Your DB password in AWS Secrets Manager rotates every 30 days. Kubernetes apps sometimes fail after rotation.",
  body:`Question: Why is this happening and how would you fix it?

What interviewers are testing: Secret refresh mechanics, app reload behavior, CSI/volume vs env vars, production reliability.`,
  scenarioAnswer:"Strong answer — Root cause: App reads the secret only at startup (e.g. env vars). Env vars don't update when the K8s Secret changes. Pods don't restart automatically after ESO updates the Secret. So they keep using the old password and connections fail. Fix options: Use volume mount instead of (or with) env — kubelet updates mounted files when the Secret changes. Or use Stakater Reloader to trigger a rolling restart when the Secret changes. Or ensure the app re-reads the secret (e.g. from /etc/secrets) on each use or with retry logic. Connection pooling with short lifetime and retry helps.",
  prod:"Volume mount + app that reads the file on each request = no restart needed. Env vars + Reloader = automatic rolling restart when Secret changes. Both are valid; document the choice.",
},
"5-3":{
  title:"Scenario 4: Multi-Environment Secret Strategy",
  concept:"You manage dev, staging, and production clusters across regions. Secrets must be isolated but centrally governed.",
  body:`Question: Design a secure and scalable secret management architecture.

What interviewers are testing: Environment isolation, IAM design, naming conventions, multi-region, enterprise maturity.`,
  scenarioAnswer:"Strong answer: Separate secret namespaces or paths per environment (e.g. dev/myapp/db, prod/myapp/db in AWS SM). IAM roles per environment so prod credentials are never in dev. Use IRSA (AWS) or Managed Identity (Azure) so each cluster has its own role. Secret naming convention (env/app/key). Audit logging enabled (CloudTrail, Azure Monitor). Least privilege — each role reads only its env's secrets. Optional: secret replication for DR.",
  prod:"Never share one IAM role across dev and prod. Namespace or path prefix (dev/ vs prod/) in the secret manager keeps isolation. Terraform workspaces or env-specific tfvars can manage this.",
},
"5-4":{
  title:"Scenario 5: etcd Encryption and Compliance",
  concept:"An auditor flags that your cluster stores secrets unencrypted in etcd.",
  body:`Question: How do you remediate this in production without breaking workloads?

What interviewers are testing: Control plane knowledge, EncryptionConfiguration, risk awareness, change management.`,
  scenarioAnswer:"Strong answer: Enable EncryptionConfiguration on the API server (aescbc or KMS provider). Restart API server in a controlled way (rolling for HA). Re-encrypt existing secrets: kubectl get secrets --all-namespaces -o json | kubectl replace -f -. Validate workloads still run. Monitor etcd and API server. Bonus: prefer KMS provider for key management; consider external secret store so fewer secrets live in etcd at all. Backup etcd before changes.",
  tip:"Senior level: red-flag answers (storing secrets in Git, one shared role for all envs). Hands-on: draw the flow Terraform → AWS SM → ESO → K8s Secret → Pod. Real scenarios: 'How would you do zero-downtime rotation?' — refreshInterval, volume mount, Reloader, app retry.",
},
"5-5":{
  title:"Scenario 6: External Secrets Not Syncing (AWS Path)",
  concept:"The ExternalSecret is stuck in SecretSyncedError. Terraform created the secret in AWS Secrets Manager. The pod cannot read the DB password.",
  body:`Question: Walk me through your step-by-step debugging process.`,
  scenarioAnswer:"What a strong candidate should cover: Check ESO logs (kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets). Verify IRSA — the ESO ServiceAccount must have the role annotation (eks.amazonaws.com/role-arn). Confirm IAM policy allows secretsmanager:GetSecretValue on the secret. Validate secret name/path in ExternalSecret (remoteRef.key) matches AWS. Check namespace (ExternalSecret and Secret in same namespace). Check refreshInterval. Confirm region (ClusterSecretStore vs secret region). Verify ESO CRD status (kubectl describe externalsecret). Red flag: Jumping straight to 'restart the pod' — the issue is in the sync chain (AWS → ESO → K8s Secret), not the pod.",
  prod:"90% of ESO sync failures are IAM (missing GetSecretValue or wrong role) or IRSA misconfiguration (annotation missing/wrong). kubectl describe externalsecret shows the condition message.",
},
"5-6":{
  title:"Scenario 7: AKS Workload Identity Failure",
  concept:"AKS deployment with Workload Identity and Key Vault worked yesterday. Today pods fail with: failed to acquire token from Azure AD.",
  body:`Question: What likely broke and how do you systematically isolate the issue?`,
  scenarioAnswer:"Expected reasoning path: Check federated identity credential still exists in Azure (identity wasn't deleted or modified). Verify ServiceAccount annotations (azure.workload.identity/client-id) and labels (azure.workload.identity/use: true). Confirm pod has the workload identity label. Validate Key Vault access — RBAC or access policy still grants the Managed Identity Secrets User (or equivalent). Check OIDC issuer URL on the cluster matches what's in the federated credential. Review CSI driver logs (kubectl logs -n kube-system -l app=secrets-store-csi-driver). Confirm tenant ID and client ID in SecretProviderClass match the identity. Senior signal: Workload Identity failures are usually identity binding drift (someone changed the federated credential, SA annotation, or Key Vault RBAC), not Kubernetes itself.",
  prod:"The trust chain is: Pod → SA (annotated) → Azure AD (federated credential) → Managed Identity → Key Vault. Break any link and token acquisition fails.",
},
"5-7":{
  title:"Scenario 8: Secret Rotation With Zero Downtime",
  concept:"After rotation, some pods briefly return 500 errors. Design a production-grade zero-downtime rotation strategy.",
  body:`Question: Design a production-grade zero-downtime rotation strategy.`,
  scenarioAnswer:"Strong answers include: Applications must not cache credentials forever — re-read from volume or use short-lived tokens. Prefer file mount over env vars (kubelet updates files when Secret changes). Use Secrets Store CSI driver with auto-rotation, or ESO with refreshInterval + rolling restart (Reloader), or a sidecar reloader. Database connection pool: retry logic and short connection lifetime so connections refresh. Staggered rollout so not all pods restart at once. Health probes tuned (readiness fails until app has new secret). Graceful termination (preStop hook, drain connections). Senior bonus: Mention dual credential rotation window — during rotation both old and new credentials work briefly; design for overlap.",
  prod:"This lab teaches rotation in Module 3 (volume vs env, Reloader, test-rotation.sh). The app reads from /etc/secrets; volume mount updates without restart. Reloader handles env-var-based apps.",
},
"5-8":{
  title:"Scenario 9: CI/CD OIDC Security Review",
  concept:"GitHub Actions uses OIDC to deploy Terraform and sync secrets. A security engineer asks: What could still go wrong here?",
  body:`Question: Identify real risks and how you would harden the pipeline.`,
  scenarioAnswer:"Strong points: Restrict OIDC trust policy to specific repo, branch, and optionally environment. Short token lifetime (already 15 min for GitHub). Separate IAM roles for plan vs apply (least privilege). Prevent fork PR access — only allow main repo or use environment protection. Use GitHub environment protection rules (required reviewers, wait timer). Mask secrets in logs (never echo secret values; verify presence only). Enable audit logging (CloudTrail for AWS, Azure Monitor for Azure). Lock down workflow permissions (contents: read, id-token: write; avoid unnecessary permissions). Senior bonus: Supply chain risk — GitHub Actions runners can run malicious code from PRs; use branch protection, required reviews, and only run workflows from trusted branches.",
  prod:"This lab's .github/workflows use OIDC and minimal permissions. The deploy workflow verifies secrets with presence check only, never printing values. Trust policy should scope to repo:org/name:ref:refs/heads/main.",
},
"5-9":{
  title:"Scenario 10: When NOT to Use External Secret Managers",
  concept:"A team proposes moving every configuration value into AWS Secrets Manager / Key Vault. Push back.",
  body:`Question: When is this the wrong design?`,
  scenarioAnswer:"Good answer: Not everything is a secret. Use secret manager for: passwords, API keys, tokens, certificates. Do NOT use for: feature flags, non-sensitive config (URLs, log levels), high-frequency reads (cost + latency + throttling), large blobs. Trade-offs: API throttling at scale, cost per secret/version, cold start or latency on first read, operational complexity (rotation, audit). Config that changes often or is not secret belongs in ConfigMaps or a config service. Senior insight: 'Secret managers are for confidentiality, not general configuration management.'",
  prod:"This lab teaches when TO use (Modules 0–4). Knowing when NOT to use shows you understand cost, latency, and blast radius — not everything belongs in a vault.",
  tip:"Interview framing: 'I built an end-to-end secrets platform across AWS and Azure, including workload identity, IRSA, rotation, and OIDC-based CI/CD. I also tested failure modes.' That signals production awareness.",
},
"5-10":{
  title:"Scenario 11: ESO Throttling AWS Secrets Manager",
  concept:"Your platform team deploys ESO across 40 microservices. AWS Secrets Manager starts throttling your account. Alerts fire across all services.",
  body:"Question: Why is this happening, and how do you fix it without restarting everything?\n\nWhat interviewers are testing: Understanding of refreshInterval at scale, API call math, ESO batching, cost awareness.",
  scenarioAnswer:"Root cause: 40 services × refreshInterval:1m = 2400 API calls/hour per secret. If each service has 3 secrets, that's 7200 calls/hour. AWS SM default quota is 10,000 calls/10 seconds — bursts can hit this easily. Fixes: Increase refreshInterval to 1h for stable secrets (most credentials don't rotate hourly). Use dataFrom instead of data to batch all keys from one secret in a single API call instead of one call per key. Stagger refreshIntervals across services so they don't all poll at the same moment. Request a quota increase from AWS if legitimately needed. Senior insight: refreshInterval:1m is almost never justified for DB passwords — use it only for short-lived tokens.",
  prod:"dataFrom: [{extract: {key: prod/myapp/database}}] fetches all JSON keys from one secret in one API call. data: fetches each key individually. For a secret with 5 keys, dataFrom is 5x fewer API calls.",
},
"5-11":{
  title:"Scenario 12: ESO Pod Crashes in Production",
  concept:"The ESO operator pod crashes and stays in CrashLoopBackOff. Your on-call gets paged. What's the blast radius?",
  body:"Question: What breaks immediately, what keeps working, and what's your recovery plan?\n\nWhat interviewers are testing: Understanding of ESO's role in the pod runtime path, K8s Secret persistence, recovery procedures.",
  scenarioAnswer:"What still works: All running pods are unaffected. K8s Secrets already synced from ESO persist — they are normal K8s objects, not deleted when ESO stops. Env vars and volume mounts keep serving the existing secret values. What breaks: New ExternalSecrets won't sync. Secret rotations won't propagate (ESO isn't polling). Any new pod that depends on a not-yet-synced ExternalSecret will fail if the K8s Secret doesn't exist yet. Recovery: Fix the ESO pod (check logs, likely a CRD version mismatch or OOM). Once ESO recovers it re-syncs all ExternalSecrets automatically. Key insight: ESO is not in the critical runtime path — it only matters for secret creation and updates, not for serving existing secrets to running pods.",
  prod:"This is why ESO is safe to deploy: it's a reconciliation controller, not a runtime dependency. A Deployment with envFrom: secretRef works as long as the K8s Secret exists, regardless of ESO health.",
},
"5-12":{
  title:"Scenario 13: Secret Access Denied Despite Correct IAM Policy",
  concept:"ESO has the correct IAM role and policy. AWS returns AccessDenied on GetSecretValue. The IAM policy simulator says Allow. The team is confused.",
  body:"Question: What is likely blocking access that the policy simulator doesn't catch?\n\nWhat interviewers are testing: Enterprise IAM knowledge, permission boundaries, SCP awareness, debugging methodology.",
  scenarioAnswer:"Likely causes in order of likelihood: 1. IAM Permission Boundary — the role has a permission boundary policy attached that doesn't include secretsmanager:GetSecretValue. Permission boundaries cap what a role can do even if the identity policy allows it. The IAM simulator tests identity policies by default, not boundaries. 2. AWS Organizations SCP — a Service Control Policy at the org or OU level denies SecretsManager access for that account or region. SCPs override even root-level policies. 3. Resource-based policy on the secret itself — the secret has a resource policy that explicitly denies the role. 4. VPC endpoint policy — if the cluster uses a VPC endpoint for Secrets Manager, the endpoint policy might not allow the role. Debugging: Use aws iam simulate-principal-policy with --permissions-boundary-policy-input-list to include the boundary. Check SCPs with aws organizations list-policies. Senior signal: Knowing permission boundaries exist and are invisible to basic IAM simulation.",
  prod:"In enterprise AWS, permission boundaries are applied to all roles created by automation to prevent privilege escalation. If your platform team created the IRSA role, ask them if a boundary was attached.",
},
"6-0":{
  title:"The full flow: creation to consumption",
  concept:"One page that ties everything together. How secrets are created and who consumes them.",
  body:`End-to-end flow (AWS example):

1. CREATE (Terraform): Terraform creates the secret in AWS Secrets Manager (e.g. prod/myapp/database) with username, password, host, port. Terraform does not create anything in Kubernetes.

2. SYNC (ESO): The External Secrets Operator runs in your cluster. You apply an ExternalSecret YAML that says: create a K8s Secret named myapp-database-creds from AWS secret prod/myapp/database. ESO reads from AWS (using IRSA) and creates/updates that K8s Secret on a schedule (refreshInterval).

3. CONSUME (Deployment): Your Deployment YAML says: this pod gets envFrom and a volume from the Secret myapp-database-creds. Kubernetes injects those into the pod at startup; volume-mounted files update when the Secret changes.

4. READ (App): Your app reads process.env.DB_PASSWORD and /etc/secrets/DB_PASSWORD. It never talks to AWS. It only sees what Kubernetes gave it.

Who creates what: Terraform → AWS secret. ESO → K8s Secret. You (Deployment) → reference that Secret. App → reads it.`,
  items:[
    ["Create","Terraform (or console) puts the secret in AWS Secrets Manager or Azure Key Vault. Source of truth lives in the cloud."],
    ["Sync","ESO (or CSI driver on Azure) copies from the cloud into a Kubernetes Secret. The ExternalSecret target.name (e.g. myapp-database-creds) is the K8s Secret name."],
    ["Consume","Deployment uses envFrom and/or volume with secretRef/secretName pointing to that K8s Secret. Pod gets env vars and/or files."],
    ["Read","App reads env and files. No cloud API calls. Rotation: update in cloud → ESO syncs → K8s Secret updates → volume files update (env vars need pod restart or Reloader)."],
  ],
  arch:true,
  prod:"Bookmark this. In an interview, you can say: 'We use Terraform to create secrets in AWS SM. ESO syncs them into K8s Secrets. Our Deployments reference those Secrets. The app just reads env and files. We never store secrets in Git or in pod spec.'",
  tip:"If ESO goes down (e.g. pod crash): the K8s Secret it already created stays — it doesn't disappear. So existing pods keep running and keep reading the secret. Only new ExternalSecrets won't sync until ESO recovers. ESO is not in the critical path for running pods; it's only in the path for syncing. Try it: kubectl delete pod -n external-secrets -l app.kubernetes.io/name=external-secrets — your app pods keep running; when the ESO pod comes back it will sync again. Interviewers ask this.",
},
};

const QUIZ = [
  { q:"An interviewer asks: 'What's wrong with native K8s Secrets?' Best answer?",
    opts:["They don't support complex data types","They are base64-encoded (not encrypted) and stored unencrypted in etcd by default — no audit trail, no rotation, no IAM-level access control","K8s Secrets are perfectly fine in production","They have a 1MB size limit"],
    c:1, ex:"K8s Secrets are base64 — not encryption. Unless you configure etcd encryption at rest, secrets are plaintext in the database. No rotation, no audit log, no fine-grained access control." },
  { q:"What does IRSA stand for and why does it matter?",
    opts:["Internal Role Service Account — scopes roles to namespaces","IAM Roles for Service Accounts — lets K8s pods assume AWS IAM roles without any access keys, via OIDC token federation","Instance Role for Secure Authentication","Integrated Role and Service API"],
    c:1, ex:"IRSA is the AWS mechanism for pod identity. The pod's ServiceAccount is annotated with an IAM Role ARN. AWS STS validates the K8s OIDC token and issues temporary credentials — no long-lived keys anywhere." },
  { q:"Your app uses env vars for DB password. You rotate the secret in AWS SM. When does the pod see the new value?",
    opts:["Immediately — ESO pushes in real time","After refreshInterval syncs the K8s Secret AND the pod restarts","Never — env vars are immutable","After 24 hours"],
    c:1, ex:"Env vars are set at pod startup and never change while the pod runs. ESO updates the K8s Secret after refreshInterval, but the pod needs to restart to pick up new env vars. Solution: volume mounts (auto-update) or Stakater Reloader." },
  { q:"ClusterSecretStore vs SecretStore in ESO — what's the difference?",
    opts:["ClusterSecretStore is for AWS, SecretStore for Azure","ClusterSecretStore is cluster-scoped (all namespaces), SecretStore is namespace-scoped (one team/namespace)","They are identical, just naming conventions","ClusterSecretStore stores more secrets"],
    c:1, ex:"Scope is the difference. ClusterSecretStore: any namespace can reference it — good for shared infra. SecretStore: one namespace only — better isolation when different teams need different IAM roles." },
  { q:"How does GitHub Actions OIDC authentication work?",
    opts:["Stores AWS keys in GitHub Secrets","GitHub exchanges a short-lived OIDC token for AWS temporary credentials (15-min expiry) via STS AssumeRoleWithWebIdentity — zero stored keys","Uses the EC2 instance profile of the runner","Hardcodes credentials in Terraform provider block"],
    c:1, ex:"GitHub acts as an OIDC identity provider. Your workflow gets a JWT from GitHub, exchanges it with AWS STS for 15-min credentials. Zero long-lived keys stored anywhere. Configure once with a trust policy in IAM." },
  { q:"What is the Azure equivalent of AWS IRSA for AKS pods?",
    opts:["Azure RBAC Service Accounts","AKS Workload Identity — a K8s ServiceAccount annotated with azure.workload.identity/client-id federates to an Azure Managed Identity via OIDC","Azure Active Directory Pod Identity (aad-pod-identity)","Azure Service Principal stored in a K8s Secret"],
    c:1, ex:"AKS Workload Identity is the modern approach (replacing the older aad-pod-identity). Federated identity credentials link a K8s ServiceAccount to an Azure Managed Identity via OIDC — no credentials stored anywhere." },
  { q:"A pod can't read its secret. What's your debugging order?",
    opts:["Restart the pod","Check: (1) secret exists in AWS SM, (2) ExternalSecret STATUS=Ready, (3) K8s Secret created, (4) IAM permissions correct, (5) pod mounts/env correct","Delete and recreate everything","Check Kubernetes version"],
    c:1, ex:"Always debug the chain: source → operator → K8s Secret → pod. kubectl describe externalsecret shows sync errors. 90% of issues are IAM — missing GetSecretValue permission or IRSA misconfiguration." },
  { q:"Why should you never print a secret value in CI logs?",
    opts:["It slows down the pipeline","CI logs are retained, potentially shared with support teams, and indexed — printing a secret effectively leaks it. Always verify presence, never value.","It's against Kubernetes best practices","It breaks the YAML formatting"],
    c:1, ex:"GitHub Actions logs are stored for 90 days by default and can be shared. A secret in a log is a leaked secret. The correct pattern: check [ -n \"$DB_PASSWORD\" ] && echo 'SET' — confirms the secret exists without exposing it." },
  { q:"Who creates the Kubernetes Secret myapp-database-creds?",
    opts:["Terraform creates it when you run terraform apply","The External Secrets Operator (ESO) creates it when it syncs from AWS Secrets Manager","The Deployment YAML creates it","You create it manually with kubectl create secret"],
    c:1, ex:"Terraform only creates the secret in AWS. ESO reads the ExternalSecret resource, fetches from AWS SM, and creates/updates the K8s Secret with the name in spec.target.name (myapp-database-creds). So ESO creates it — not Terraform." },
  { q:"In the AWS flow, what is the correct order of 'who does what'?",
    opts:["App reads from AWS → ESO syncs → Pod gets env","Terraform creates secret in AWS SM → ESO creates K8s Secret from it → Deployment tells pod to use that K8s Secret → App reads env/files","Pod creates the secret → ESO syncs to AWS","Deployment creates the K8s Secret → ESO fills it from AWS"],
    c:1, ex:"Terraform creates the source (AWS SM). ESO syncs that into a K8s Secret. The Deployment references that Secret so the pod gets it. The app only reads what Kubernetes gave it — it never talks to AWS." },
  { q:"Why prefer volume mount over env vars for secrets when you rotate often?",
    opts:["Volume mounts are faster","Volume mounts update automatically when the K8s Secret changes (kubelet syncs); env vars are set at pod start and never change until the pod restarts","Env vars are not supported by ESO","Volume mounts use less memory"],
    c:1, ex:"Env vars are baked in at pod startup. After ESO updates the K8s Secret, the volume-mounted files get updated by kubelet (~60s). So the app can re-read the file and get the new value without a restart. With env vars you need a rolling restart (e.g. Reloader)." },
  { q:"You delete the ExternalSecret resource. What happens to the K8s Secret myapp-database-creds?",
    opts:["Nothing — the Secret stays","ESO deletes it (with creationPolicy: Owner, ESO owns the Secret and deletes it when the ExternalSecret is removed)","Terraform deletes it","You have to delete it manually"],
    c:1, ex:"creationPolicy: Owner means ESO owns the K8s Secret. When the ExternalSecret is deleted, ESO garbage-collects the Secret. Use creationPolicy: Orphan if you want the Secret to remain after removing the ExternalSecret." },
  { q:"What is refreshInterval in an ExternalSecret, and what's the trade-off if you set it very low (e.g. 10s)?",
    opts:["How often the pod restarts — lower is better","How often ESO polls AWS SM and updates the K8s Secret — lower = faster rotation pickup but more API calls and risk of rate limiting","How often Terraform runs — lower means more cost","How long the secret is valid"],
    c:1, ex:"refreshInterval is ESO's poll interval. Shorter (e.g. 5m) means faster sync after rotation but more GetSecretValue calls to AWS. Too short can hit rate limits. For stable secrets 1h is fine; for frequently rotated ones 5m is common." },
  { q:"In Azure, what plays the role of 'ExternalSecret' — i.e. what tells the system to sync which Key Vault secrets into the pod?",
    opts:["Terraform only","SecretProviderClass — it lists which Key Vault secrets to fetch and optionally sync to a K8s Secret","The Deployment volumeMount","ClusterSecretStore"],
    c:1, ex:"SecretProviderClass is the Azure equivalent of the ExternalSecret + store. It names the Key Vault, the Managed Identity (clientID), and which secret names to fetch. The CSI driver uses it when mounting the volume; with secretObjects it also creates a K8s Secret." },
  { q:"Why is 'store secrets in Git' a bad idea, even if the repo is private?",
    opts:["Git is slow","Private repos are still cloned, copied, and logged — secrets can leak via history, forks, or CI. Use a secrets manager and inject at deploy/runtime.","Git doesn't support binary secrets","Kubernetes doesn't support Git-based secrets"],
    c:1, ex:"Secrets in Git live in history forever. Anyone with clone access, CI logs, or a fork can see them. Private doesn't mean secure. The pattern: store in AWS SM / Azure KV, reference by name in code, inject at runtime via ESO or CSI." },
  { q:"What does the secret.reloader.stakater.com/reload annotation on a Deployment do?",
    opts:["Tells ESO to sync more often","Stakater Reloader watches the named K8s Secret and triggers a rolling restart of the Deployment when that Secret changes","Tells Kubernetes to encrypt the Secret","Makes the Secret available to the pod"],
    c:1, ex:"Reloader is a separate controller. When it sees the annotation, it watches that Secret. When the Secret's data changes (e.g. after ESO syncs a new value), Reloader does a rolling restart so pods pick up new env vars. Helps when your app only reads secrets at startup." },
  { q:"Where is the 'source of truth' for secrets in the ESO pattern?",
    opts:["The Kubernetes Secret","The Deployment YAML","AWS Secrets Manager or Azure Key Vault — K8s Secret is a synced copy","Git"],
    c:2, ex:"The cloud secret manager (AWS SM, Azure KV) is the source of truth. The K8s Secret is a synchronized cache maintained by ESO. Rotation occurs in the cloud; ESO reconciles the K8s Secret. Pods receive updates via volume refresh or a rolling restart — env vars do not update dynamically." },
  { q:"How does ESO authenticate to AWS to read secrets?",
    opts:["Access keys stored in a K8s Secret","IRSA — ESO's ServiceAccount is annotated with an IAM role ARN; it uses the pod's OIDC token to get temporary credentials from AWS STS","The node IAM role","Terraform passes credentials at apply time"],
    c:1, ex:"IRSA (IAM Roles for Service Accounts). ESO runs as a pod; its ServiceAccount has an annotation with the IAM role ARN. AWS trusts the cluster OIDC issuer. The pod gets a short-lived token and exchanges it for AWS credentials. No long-lived keys in the cluster." },
  { q:"You have a secret in AWS SM with 5 JSON keys. Your ExternalSecret uses data: with 5 separate entries. What's a more efficient approach and why?",
    opts:["Use secretStoreRef instead","Use dataFrom: [{extract: {key: secret-name}}] — syncs all keys in one API call instead of 5","Increase the refreshInterval","Use ClusterSecretStore instead of SecretStore"],
    c:1, ex:"dataFrom with extract fetches the entire JSON secret and maps all keys automatically — one API call for all keys. data: makes one API call per key. At scale (many services, many keys) this directly affects AWS SM API quotas and costs." },
  { q:"ESO crashes and stays in CrashLoopBackOff for 2 hours. What happens to pods that were already running with secrets injected via envFrom: secretRef?",
    opts:["Pods crash immediately — they lose access to the secret","Pods keep running normally — K8s Secrets persist and ESO is not in the runtime path","Pods restart automatically to re-fetch secrets","The ExternalSecret controller takes over from ESO"],
    c:1, ex:"ESO is a reconciliation controller, not a runtime dependency. K8s Secrets it created persist as normal K8s objects. Running pods with envFrom or volume mounts are unaffected. ESO going down only prevents new syncs and rotation propagation — existing secrets keep serving." },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Code({ file, content }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="code-wrap">
      <div className="code-hd">
        <div className="code-fname">
          <div className="dots">
            <div className="dot" style={{background:"#ff5f56"}}/>
            <div className="dot" style={{background:"#ffbd2e"}}/>
            <div className="dot" style={{background:"#27c93f"}}/>
          </div>
          <span style={{marginLeft:8}}>{file}</span>
        </div>
        <button className={`copy-btn${ok?" ok":""}`} onClick={()=>{setOk(true);setTimeout(()=>setOk(false),2000)}}>
          {ok?"✓ copied":"copy"}
        </button>
      </div>
      <pre dangerouslySetInnerHTML={{__html:content}}/>
    </div>
  );
}

function Term({ content }) {
  return (
    <div className="term">
      <div className="term-hd">
        <div className="dot" style={{background:"#ff5f56",width:9,height:9,borderRadius:"50%",display:"inline-block"}}/>
        <div className="dot" style={{background:"#ffbd2e",width:9,height:9,borderRadius:"50%",display:"inline-block",marginLeft:4}}/>
        <div className="dot" style={{background:"#27c93f",width:9,height:9,borderRadius:"50%",display:"inline-block",marginLeft:4}}/>
        <span className="term-title" style={{marginLeft:10}}>terminal</span>
      </div>
      <div className="term-body" dangerouslySetInnerHTML={{__html:content}}/>
    </div>
  );
}

function Checklist({ items }) {
  const [done, setDone] = useState([]);
  const tog = i => setDone(d => d.includes(i)?d.filter(x=>x!==i):[...d,i]);
  return (
    <div className="cl">
      {items.map((it,i)=>(
        <div key={i} className={`ci${done.includes(i)?" chk":""}`} onClick={()=>tog(i)}>
          <div className="cb">{done.includes(i)?"✓":""}</div>
          <div className="ci-txt">{it}</div>
        </div>
      ))}
      {done.length===items.length&&<div className="cl-done">🚀 All set! Let's build.</div>}
    </div>
  );
}

function ItemList({ items }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10,margin:"14px 0"}}>
      {items.map(([label,desc],i)=>(
        <div key={i} style={{background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:7,padding:"12px 15px"}}>
          <div style={{fontSize:11,fontWeight:800,color:"var(--ac)",fontFamily:"var(--mono)",marginBottom:4}}>{label}</div>
          <div style={{fontSize:12,color:"#8ab",lineHeight:1.6}}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

function Arch({ moduleId }) {
  const isAzure = moduleId === 2;
  return (
    <div className="arch">
      <div style={{textAlign:"center",marginBottom:18,fontSize:10,color:"var(--mu)",fontFamily:"var(--mono)",letterSpacing:1}}>
        {isAzure ? "AZURE DATA FLOW" : "AWS DATA FLOW"}
      </div>
      <div className="arch-row">
        <div><div className="ab tf">Terraform</div><div style={{fontSize:9,color:"var(--mu)",textAlign:"center",marginTop:3}}>provisions</div></div>
        <div className="aa">→</div>
        <div><div className={`ab ${isAzure?"aks":"aws"}`}>{isAzure?"Azure Key Vault":"AWS Secrets Mgr"}</div><div style={{fontSize:9,color:"var(--mu)",textAlign:"center",marginTop:3}}>source of truth</div></div>
      </div>
      <div style={{textAlign:"center",margin:"6px 0",color:"var(--mu)",fontSize:16}}>↓</div>
      <div className="arch-row">
        <div><div className="ab eso">{isAzure?"CSI Driver":"External Secrets Op"}</div><div style={{fontSize:9,color:"var(--mu)",textAlign:"center",marginTop:3}}>polls every interval</div></div>
        <div className="aa">→</div>
        <div><div className="ab k8s">K8s Secret</div><div style={{fontSize:9,color:"var(--mu)",textAlign:"center",marginTop:3}}>synced copy</div></div>
      </div>
      <div style={{textAlign:"center",margin:"6px 0",color:"var(--mu)",fontSize:16}}>↓</div>
      <div className="arch-row">
        <div><div className="ab pod">Your Pod</div><div style={{fontSize:9,color:"var(--mu)",textAlign:"center",marginTop:3}}>reads env / volume</div></div>
        <div className="aa">↔</div>
        <div style={{background:"rgba(0,229,255,.04)",border:"1px solid rgba(0,229,255,.1)",borderRadius:7,padding:"8px 12px",fontSize:10,color:"var(--mu)",fontFamily:"var(--mono)"}}>process.env<br/>DB_PASSWORD<br/>/etc/secrets/</div>
      </div>
      <div className="arch-note">✓ App code has zero knowledge of {isAzure?"Azure Key Vault or CSI Driver":"AWS SM or ESO"}</div>
    </div>
  );
}

function StepContent({ moduleId, stepIdx }) {
  const key = `${moduleId}-${stepIdx}`;
  const s = STEPS[key];
  const stepName = MODULES[moduleId]?.steps[stepIdx];
  const [scenarioRevealed, setScenarioRevealed] = useState({});
  const [scenarioElapsed, setScenarioElapsed] = useState({});
  const scenarioIntervalRef = useRef(null);

  useEffect(() => {
    const step = STEPS[key];
    if (!step?.scenarioAnswer || scenarioRevealed[key]) return;
    scenarioIntervalRef.current = setInterval(() => {
      setScenarioElapsed(prev => {
        const cur = prev[key] || 0;
        if (cur >= 29) {
          if (scenarioIntervalRef.current) clearInterval(scenarioIntervalRef.current);
          return { ...prev, [key]: 30 };
        }
        return { ...prev, [key]: cur + 1 };
      });
    }, 1000);
    return () => { if (scenarioIntervalRef.current) clearInterval(scenarioIntervalRef.current); };
  }, [key, scenarioRevealed[key]]);

  const pathTypeFallback = MODULES[moduleId]?.stepPaths?.[stepIdx] || "both";
  if (!s) return (
    <div className="sc fi">
      <div className="sc-hd"><div><div className="sc-step-num">STEP {stepIdx+1}</div><div className="sc-title">{stepName}</div></div></div>
      <div className="sc-body">
        <div className="path-pills">
          {pathTypeFallback === "eks-only" ? <span className="path-pill eks-only">EKS only</span> : <><span className="path-pill local">Local ✓</span><span className="path-pill eks">EKS ✓</span></>}
        </div>
        <div className="concept"><div className="concept-lbl">📦 In the Repo</div>
          <p>The full code for this step is in the repo. Open the file shown in the lab-ui sidebar and follow along.</p></div>
        <div className="tip"><p>Run: <strong>ls terraform/ k8s/ .github/</strong> to see all the files for this step.</p></div>
      </div>
    </div>
  );

  const elapsed = scenarioElapsed[key] || 0;
  const revealed = scenarioRevealed[key];
  const isScenario = !!s.scenarioAnswer;

  const pathType = MODULES[moduleId]?.stepPaths?.[stepIdx] || "both";
  return (
    <div className="sc fi">
      <div className="sc-hd">
        <div><div className="sc-step-num">STEP {stepIdx+1}</div><div className="sc-title">{s.title}</div></div>
      </div>
      <div className="sc-body">
        <div className="path-pills">
          {pathType === "eks-only" ? (
            <span className="path-pill eks-only">EKS only</span>
          ) : (
            <>
              <span className="path-pill local">Local ✓</span>
              <span className="path-pill eks">EKS ✓</span>
            </>
          )}
        </div>
        {key === "0-3" && (
          <div className="concept" style={{marginBottom:16}}>
            <div className="concept-lbl">Choose your path</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginTop:8}}>
              <thead><tr style={{borderBottom:"1px solid var(--bd)"}}><th style={{textAlign:"left",padding:"8px 6px"}}></th><th style={{textAlign:"left",padding:"8px 6px"}}>Local (kind / MicroK8s)</th><th style={{textAlign:"left",padding:"8px 6px"}}>EKS</th></tr></thead>
              <tbody style={{color:"#8ab"}}>
                <tr style={{borderBottom:"1px solid var(--bd)"}}><td style={{padding:"6px"}}>Setup time</td><td style={{padding:"6px"}}>~5 min</td><td style={{padding:"6px"}}>~20 min</td></tr>
                <tr style={{borderBottom:"1px solid var(--bd)"}}><td style={{padding:"6px"}}>Cost</td><td style={{padding:"6px"}}>Free</td><td style={{padding:"6px"}}>~$0.10/hr + AWS</td></tr>
                <tr style={{borderBottom:"1px solid var(--bd)"}}><td style={{padding:"6px"}}>CI/CD</td><td style={{padding:"6px"}}>✗</td><td style={{padding:"6px"}}>✓</td></tr>
                <tr style={{borderBottom:"1px solid var(--bd)"}}><td style={{padding:"6px"}}>App URL</td><td style={{padding:"6px"}}>Port-forward</td><td style={{padding:"6px"}}>ALB</td></tr>
              </tbody>
            </table>
            <p style={{marginTop:10,fontSize:12,color:"#8ab"}}>Pick one path; the lab content applies to both. EKS-only steps are marked with a pill.</p>
          </div>
        )}
        {s.concept && <div className="concept"><div className="concept-lbl">💡 The Concept</div><p>{s.concept}</p></div>}
        {s.arch && <Arch moduleId={moduleId}/>}
        {s.body && <p style={{fontSize:12,color:"#8ab",lineHeight:1.8,marginBottom:14,whiteSpace:"pre-line"}}>{s.body}</p>}
        {isScenario && (
          <>
            {!revealed && (
              <>
                <div className={`scenario-timer${elapsed>=30?" ready":""}`}>
                  <span className="scenario-timer-txt">Reason for 30s before revealing the answer</span>
                  <span className="scenario-timer-num">{String(Math.floor(elapsed/60)).padStart(1,"0")}:{String(elapsed%60).padStart(2,"0")} / 0:30</span>
                </div>
                <button type="button" className="scenario-reveal-btn" disabled={elapsed<30} onClick={()=>setScenarioRevealed(prev=>({...prev,[key]:true}))}>
                  {elapsed<30 ? `Reveal answer (${30-elapsed}s left)` : "Reveal answer"}
                </button>
              </>
            )}
            {revealed && (
              <>
                <div className="scenario-answer"><strong>Answer — </strong>{s.scenarioAnswer}</div>
                {s.prod && <div className="prod"><span className="prod-icon">🏭</span><p><strong>Production thinking: </strong>{s.prod}</p></div>}
                {s.tip && <div className="tip"><span style={{fontSize:14,flexShrink:0}}>💡</span><p>{s.tip}</p></div>}
              </>
            )}
          </>
        )}
        {!isScenario && (
          <>
            {s.costCallout && <div className="tip" style={{background:"rgba(239,68,68,.08)",borderColor:"rgba(239,68,68,.25)"}}><span style={{fontSize:14,flexShrink:0}}>⚠</span><p>{s.costCallout}</p></div>}
            {s.checklist && <Checklist items={s.checklist}/>}
            {s.items && <ItemList items={s.items}/>}
            {s.code && <Code file={s.code.file} content={s.code.content}/>}
            {s.term && <Term content={s.term}/>}
            {s.prod && <div className="prod"><span className="prod-icon">🏭</span><p><strong>Production thinking: </strong>{s.prod}</p></div>}
            {s.tip && <div className="tip"><span style={{fontSize:14,flexShrink:0}}>💡</span><p>{s.tip}</p></div>}
          </>
        )}
      </div>
    </div>
  );
}

function QuizView() {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [done, setDone] = useState(false);
  const [quizKey, setQuizKey] = useState(0);
  const cardRefs = useRef([]);

  const shuffledQuiz = useMemo(() => {
    const withShuffledOpts = QUIZ.map((q) => {
      const optOrder = shuffle([...Array(q.opts.length).keys()]);
      return { ...q, opts: optOrder.map((i) => q.opts[i]), c: optOrder.indexOf(q.c) };
    });
    return shuffle(withShuffledOpts);
  }, [quizKey]);

  const pick = (qi, oi) => {
    if (revealed[qi]) return;
    setAnswers((a) => ({ ...a, [qi]: oi }));
    setRevealed((r) => ({ ...r, [qi]: true }));
  };
  const score = Object.keys(revealed).filter((qi) => answers[qi] === shuffledQuiz[qi].c).length;
  const answered = Object.keys(revealed).length;
  const wrongIndices = Object.keys(revealed).filter((qi) => answers[qi] !== shuffledQuiz[qi].c).map(Number).sort((a, b) => a - b);

  const scrollToFirstWrong = () => {
    setDone(false);
    requestAnimationFrame(()=>{
      const first = wrongIndices[0];
      if (typeof first === "number" && cardRefs.current[first]) {
        cardRefs.current[first].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  if (done) {
    const pct = Math.round((score / shuffledQuiz.length) * 100);
    const col = pct>=80?"var(--go)":pct>=60?"var(--wa)":"var(--re)";
    return (
      <div className="score-wrap fi">
        {pct>=80&&<div className="score-celebration">🏆</div>}
        <div className="score-big" style={{color:col}}>{score}/{shuffledQuiz.length}</div>
        <div className="score-lbl">{pct>=80?"Interview Ready!":pct>=60?"Getting there — review the weak spots":"Keep going — redo the labs first"}</div>
        <p style={{fontSize:12,color:"var(--mu)",marginBottom:16}}>{pct>=80?"You can confidently explain K8s secrets patterns in any interview.":"Go back through the modules and focus on the concepts you missed."}</p>
        {wrongIndices.length>0&&(
          <>
            <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",letterSpacing:1,marginBottom:8}}>INCORRECT: Q{wrongIndices.map(i=>i+1).join(", Q")}</div>
            <div className="score-breakdown">
              {wrongIndices.map(i=><span key={i} className="score-wrong">Q{i+1}</span>)}
              {wrongIndices.length<shuffledQuiz.length&&<span className="score-correct">+{score} correct</span>}
            </div>
            <button className="btn btn-s" style={{marginBottom:10}} onClick={scrollToFirstWrong}>Review incorrect →</button>
          </>
        )}
        <button className="btn btn-p" onClick={()=>{setQuizKey(k=>k+1);setAnswers({});setRevealed({});setDone(false)}}>Retry full quiz (new order)</button>
      </div>
    );
  }

  return (
    <div className="fi">
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:"var(--mu)",fontFamily:"var(--mono)",letterSpacing:2,marginBottom:8}}>🎯 INTERVIEW PREP</div>
        <div style={{fontSize:26,fontWeight:800,marginBottom:6}}>Interview Question Bank</div>
        <div style={{fontSize:12,color:"var(--mu)"}}>Real questions from senior/staff engineer interviews. Select an answer — explanation reveals instantly.</div>
      </div>
      <div className="quiz-prog" style={{alignItems:"center"}}>
        <span style={{fontSize:11,color:"var(--ac)",fontFamily:"var(--mono)",fontWeight:700}}>{answered}/{shuffledQuiz.length}</span>
        <div className="quiz-prog-bar">
          <div className="quiz-prog-fill" style={{width:`${(answered/shuffledQuiz.length)*100}%`}}/>
        </div>
        <span style={{fontSize:11,color:"var(--go)",fontFamily:"var(--mono)",fontWeight:700}}>{score} ✓</span>
      </div>
      <div className="quiz-dots">
        {shuffledQuiz.map((q,qi)=>{
          let dotClass = "quiz-dot";
          if (revealed[qi]) dotClass += answers[qi]===q.c ? " answered" : " wrong";
          return <div key={qi} className={dotClass} title={`Q${qi+1}${revealed[qi]?(answers[qi]===q.c?" ✓":" ✗"):""}`}/>;
        })}
      </div>
      {shuffledQuiz.map((q,qi)=>(
        <div key={qi} ref={el=>cardRefs.current[qi]=el} className={`qcard${revealed[qi]?" revealed":""}`}>
          <span className="q-num">Q{qi+1} of {shuffledQuiz.length}</span>
          <div className="q-text">{q.q}</div>
          <div className="q-opts">
            {q.opts.map((opt,oi)=>{
              let cls="qo";
              if (revealed[qi]){if(oi===q.c)cls+=" correct";else if(answers[qi]===oi)cls+=" wrong";}
              return (
                <div key={oi} className={cls} onClick={()=>pick(qi,oi)}>
                  <div className="ql">{revealed[qi]&&(oi===q.c||answers[qi]===oi)?(oi===q.c?"✓":"✗"):["A","B","C","D"][oi]}</div>{opt}
                </div>
              );
            })}
          </div>
          {revealed[qi]&&(
            <div className="q-explain fi">
              <strong>{answers[qi]===q.c?"✓ Correct! ":"✗ Not quite. "}</strong>{q.ex}
            </div>
          )}
        </div>
      ))}
      {answered===shuffledQuiz.length&&(
        <div style={{textAlign:"center",marginTop:20}}>
          <button className="btn btn-g" onClick={()=>setDone(true)}>See my score →</button>
        </div>
      )}
    </div>
  );
}

function HomeView({ onSelect }) {
  const [track, setTrack] = useState("all");
  return (
    <div className="fi">
      <div className="hero">
        <div className="hero-tag">⚡ HANDS-ON LAB · PRODUCTION-GRADE</div>
        <h1>K8s Secrets<br/><span>Done Right</span></h1>
        <p className="hero-desc">AWS Secrets Manager + Azure Key Vault. Terraform. Rotation. CI/CD. No handwaving — every step is real, runnable code.</p>
        <div className="hero-stats">
          {[[MODULES.length,"Modules"],[MODULES.reduce((a,m)=>a+m.steps.length,0),"Steps"],[QUIZ.length,"Quiz Qs"],["10","Scenarios"]].map(([n,l])=>(
            <div key={l}><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div></div>
          ))}
        </div>
      </div>
      <div className="cnt">
        <div className="mc" style={{marginBottom:24,borderColor:"var(--ac)",background:"rgba(0,229,255,.06)"}} onClick={()=>onSelect(6)}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--ac)",marginBottom:6}}>🖼️ NEW HERE?</div>
          <div style={{fontSize:16,fontWeight:800,marginBottom:6}}>Start with Full flow recap</div>
          <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5}}>One page: how secrets are created and consumed, end to end. Get the big picture before diving into modules.</div>
          <div style={{fontSize:10,color:"var(--ac)",marginTop:10,fontWeight:700}}>→ Open Full flow recap</div>
        </div>
        <div style={{marginBottom:14,fontSize:11,color:"var(--mu)",fontWeight:700,letterSpacing:2,fontFamily:"var(--mono)"}}>REPO MAP</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:28}}>
          {[["lab-ui/","This UI + tutorial"],["terraform/aws/","AWS SM + ESO + IRSA"],["terraform/azure/","Key Vault + AKS + Workload Identity"],["k8s/aws/","ExternalSecret + Deployment"],["k8s/azure/","SecretProviderClass + Deployment"],["app/","Sample Node app (Dockerfile + server.js)"],[".github/workflows/","Terraform + Deploy CI/CD"],["rotation/","Test rotation script"]].map(([path,desc],i)=>(
            <div key={i} style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:700,color:"var(--ac)",marginBottom:4}}>{path}</div>
              <div style={{fontSize:10,color:"var(--mu)",lineHeight:1.4}}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:6,fontSize:11,color:"var(--mu)",fontWeight:700,letterSpacing:2,fontFamily:"var(--mono)"}}>QUICK START</div>
        <Term content={`<span class="t-p">$</span> <span class="t-c">git clone https://github.com/Osomudeya/k8s-secret-lab</span>
<span class="t-p">$</span> <span class="t-c">cd k8s-secret-lab/lab-ui && npm install && npm run dev</span>
<span class="t-s">✓ Lab running at http://localhost:5173</span>
<span class="t-o">   Now open a second terminal and follow the module steps</span>`}/>
        <div style={{marginBottom:10,fontSize:11,color:"var(--mu)",fontWeight:700,letterSpacing:2,fontFamily:"var(--mono)",marginTop:28}}>LEARNING PATH</div>
        <div style={{fontSize:20,fontWeight:800,marginBottom:16}}>Pick a Module</div>
        <div className="mc-grid">
          {MODULES.map((m,i)=>(
            <div key={i} className={`mc c${i}`} onClick={()=>onSelect(i)}>
              <div className="mc-icon">{m.icon}</div>
              <div className="mc-num">MODULE {String(i+1).padStart(2,"0")}</div>
              <div className="mc-title">{m.title}</div>
              <div className="mc-desc">{m.desc}</div>
              <div className="mc-foot">
                <div className="mc-steps">{m.steps.length} steps</div>
                <span className={`ni-tag tag-${m.tc}`}>{m.tag}</span>
              </div>
            </div>
          ))}
          <div className="mc cq" onClick={()=>onSelect("quiz")}>
            <div className="mc-icon">🎯</div>
            <div className="mc-num">BONUS</div>
            <div className="mc-title">Interview Question Bank</div>
            <div className="mc-desc">Real interview questions with instant feedback and detailed explanations.</div>
            <div className="mc-foot">
              <div className="mc-steps">{QUIZ.length} questions</div>
              <span className="ni-tag tag-quiz">QUIZ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleView({ moduleId, onBack, completed, onComplete }) {
  const [step, setStep] = useState(0);
  const m = MODULES[moduleId];
  const contentRef = useRef(null);
  useEffect(() => {
    contentRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [step]);
  return (
    <div className="fi">
      <div className="top-nav">
        <button className="btn btn-s" style={{padding:"6px 13px",fontSize:13}} onClick={onBack}>← Back</button>
        <div className="bc">
          <span>Lab</span><span style={{color:"var(--bd)"}}>›</span>
          <span>{m.title}</span><span style={{color:"var(--bd)"}}>›</span>
          <span className="bc-cur">{m.steps[step]}</span>
        </div>
        <span className={`ni-tag tag-${m.tc}`} style={{marginLeft:"auto"}}>{m.tag}</span>
      </div>
      <div className="cnt" ref={contentRef} style={{ overflowY: "auto", maxHeight: "calc(100vh - 52px)" }}>
        <div className="step-layout">
          <div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"var(--mu)",fontFamily:"var(--mono)",marginBottom:10}}>STEPS</div>
            <div className="step-list">
              {m.steps.map((s,i)=>{
                const isDone = completed[`${moduleId}-${i}`];
                return (
                  <div key={i} className={`si${step===i?" active":""}${isDone?" done":""}`} onClick={()=>setStep(i)}>
                    <div className={`sn${step===i?" active":""}${isDone?" done":""}`}>{isDone?"✓":i+1}</div>
                    <span style={{fontSize:11,fontWeight:600}}>{s}</span>
                  </div>
                );
              })}
            </div>
            <div className="step-progress">
              <div className="sp-label">PROGRESS</div>
              <div className="sp-val">{Object.keys(completed).filter(k=>k.startsWith(`${moduleId}-`)).length}/{m.steps.length}</div>
            </div>
          </div>
          <div>
            <StepContent moduleId={moduleId} stepIdx={step}/>
            <div className="step-nav">
              {step>0&&<button className="btn btn-s" onClick={()=>setStep(s=>s-1)}>← Prev</button>}
              {!completed[`${moduleId}-${step}`]&&(
                <button className="btn btn-g" onClick={()=>onComplete(moduleId,step)}>✓ Done</button>
              )}
              {step<m.steps.length-1&&(
                <button className="btn btn-p" onClick={()=>setStep(s=>s+1)}>Next →</button>
              )}
              {step===m.steps.length-1&&(
                <button className="btn btn-p" onClick={onBack}>← Back to Modules</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("home");
  const [mod, setMod] = useState(null);
  const [completed, setCompleted] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const total = MODULES.reduce((a,m)=>a+m.steps.length,0);
  const done = Object.keys(completed).length;
  const pct = Math.round((done/total)*100);

  const go = id => { if(id==="quiz"){setView("quiz");return;} setMod(id);setView("module"); };
  const complete = (m,s) => setCompleted(c=>({...c,[`${m}-${s}`]:true}));
  const resetProgress = () => { if (window.confirm("Reset all progress?")) setCompleted({}); };

  const navItems = [
    {label:"Home",icon:"🏠",id:"home"},
    ...MODULES.map((m,i)=>({label:m.title,icon:m.icon,id:`m${i}`,mid:i,tc:m.tc})),
    {label:"Interview Quiz",icon:"🎯",id:"quiz",badge:"NEW"},
  ];

  return (
    <>
      <style>{G}</style>
      <div className="app">
        <button type="button" className="hamburger" onClick={()=>setMobileMenuOpen(o=>!o)} title="Toggle menu" aria-label="Toggle menu">☰</button>
        <div className={`sb${sidebarCollapsed ? " collapsed" : ""}${mobileMenuOpen ? " mobile-open" : ""}`}>
          <div className="sb-logo" style={{position:"relative"}}>
            <button type="button" className="sb-toggle" onClick={()=>setSidebarCollapsed(c=>!c)} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{sidebarCollapsed ? ">" : "<"}</button>
            {!sidebarCollapsed && <div className="sb-badge"><span>K8S LAB</span></div>}
            <div className="sb-title">{sidebarCollapsed ? "🔐" : "K8s Secrets Lab"}</div>
            <div className="sb-sub">aws · aks · terraform · cicd</div>
          </div>
          <nav className="sb-nav">
            <div className="sb-sec">Navigation</div>
            {navItems.map(item=>{
              const isActive=(item.id==="home"&&view==="home")||(item.id==="quiz"&&view==="quiz")||(item.mid!==undefined&&view==="module"&&mod===item.mid);
              const isDone=item.mid!==undefined&&MODULES[item.mid]?.steps.every((_,i)=>completed[`${item.mid}-${i}`]);
              return (
                <div key={item.id} className={`ni${isActive?" active":""}`}
                  onClick={()=>{ if (item.mid!==undefined) go(item.mid); else if (item.id==="quiz") go("quiz"); else setView("home"); setMobileMenuOpen(false); }}>
                  <span className="ni-icon">{item.icon}</span>
                  <span className="ni-label">{item.label}</span>
                  {item.badge&&<span className={`ni-tag tag-new`}>{item.badge}</span>}
                  {item.tc&&!item.badge&&<span className={`ni-tag tag-${item.tc}`}>{MODULES[item.mid]?.tag}</span>}
                  {isDone&&<span className="ni-done">✓</span>}
                </div>
              );
            })}
          </nav>
          <div className="sb-foot">
            <div className="pb-wrap"><div className="pb-fill" style={{width:`${pct}%`}}/></div>
            <div className="pb-txt">{done}/{total} steps · {pct}%</div>
            {!sidebarCollapsed && (
              <button type="button" className="btn btn-s" style={{marginTop:8,width:"100%",fontSize:12,opacity:0.8}} onClick={resetProgress} title="Clear all step completion">Reset</button>
            )}
            <div style={{fontSize:11,color:"var(--mu)",marginTop:6,fontFamily:"var(--mono)"}}>v1.1.0</div>
          </div>
        </div>
        <div className="main">
          {view==="home"&&<HomeView onSelect={go}/>}
          {view==="module"&&mod!==null&&<ModuleView moduleId={mod} onBack={()=>setView("home")} completed={completed} onComplete={complete}/>}
          {view==="quiz"&&(
            <div>
              <div className="top-nav">
                <button className="btn btn-s" style={{padding:"6px 13px",fontSize:11}} onClick={()=>setView("home")}>← Back</button>
                <span style={{fontSize:12,color:"var(--mu)"}}>Interview Question Bank</span>
              </div>
              <div className="cnt"><QuizView/></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
