# Changes — Lab Fix Pass v1.1.0

Generated: 2025-02-28

## Summary

This pass implements Terraform hardening (pinned kubectl provider, kubeconfig/cluster_context variables, IAM trust policy fix for non-EKS, rotation comment, sensitive outputs, random_password output, CRD wait 30s, .gitignore), Lab UI improvements (Google Fonts with fallbacks, increased font sizes, scroll-to-top on step change, collapsible sidebar, breadcrumb, Reset Progress with confirm, mobile breakpoints and hamburger menu, version badge v1.1.0), and interview content (three new scenarios 5-10–5-12, two new quiz questions, Sealed Secrets note in Tools Overview, Bonus step 1-5 dataFrom/templating). Repo hygiene: CHANGELOG 1.1.0, package.json version 1.1.0. Ghost directories were not present; .DS_Store was already in .gitignore; LICENSE already present (2025).

## Terraform

| File | Change | Reason |
|------|--------|--------|
| terraform/aws/main.tf | Pinned `gavinbunney/kubectl` to `= 1.14.0`; added comment (community provider, CRD manifests, hashicorp/kubectl different resource names, link to issues). Added `locals { kube_config_context = var.use_eks ? null : (var.cluster_context != "" ? var.cluster_context : null) }`. Helm and kubectl providers use `local.kube_config_context` so empty context uses current. Bumped `random` to `~> 3.6`. | Stability and learner guidance; avoid breaking changes; correct context handling when empty. |
| terraform/aws/variables.tf | Reordered: `kubeconfig_path` first (default `~/.kube/config`, description for MicroK8s/Kind). `cluster_context` second (default `""`, description: leave empty for current context; kind → `kind-secrets-lab`, MicroK8s → `microk8s`). | Match prompt; support MicroK8s and Kind explicitly. |
| terraform/aws/iam.tf | Replaced single statement with two dynamic statements: EKS branch (OIDC + condition); non-EKS branch (account root, no condition). Inline comment: "Local cluster: static credential auth is used instead (see k8s/aws/secret-store-static.yaml). This trust policy is intentionally broad for lab use only." | Non-EKS role is for lab static auth only; avoid meaningless `aws:RequestedRegion` condition. |
| terraform/aws/secret.tf | Expanded rotation comment: "Without rotation_lambda_arn AWS accepts this resource but rotation never actually executes. For real rotation use test-rotation.sh manually or add a Lambda. This resource only sets the schedule, not the mechanism." Replaced comment above random_password with "Never hardcode passwords in Terraform — even for labs. random_password teaches the right pattern." | Clarify rotation behaviour and password hygiene. |
| terraform/aws/outputs.tf | Added `random_password_value` output (sensitive). `secret_arn` and `eso_role_arn` already had `sensitive = true`. | Learners can retrieve initial password; avoid leaking ARNs in CI. |
| terraform/aws/eso.tf | time_sleep `create_duration` changed from 15s to 30s. Comment: "ESO CRDs need time to register after Helm install. Without this sleep, the ClusterSecretStore apply fails with 'no kind ClusterSecretStore'." | Reduce CRD race; clearer comment. |
| .gitignore | Added `*.tfvars`, `terraform/aws/terraform.tfstate`, `terraform/azure/terraform.tfstate`. `.DS_Store` already present. | Avoid committing secrets in tfvars; explicit tfstate paths. |
| (all terraform) | Ran `terraform fmt -recursive terraform/`. | Formatting. |

## Lab UI

| File | Change | Reason |
|------|--------|--------|
| lab-ui/index.html | Added Google Fonts preconnect and link for Space Mono and Syne. | Offline fallback is in CSS variables; fonts improve readability when loaded. |
| lab-ui/src/App.jsx | CSS `:root`: `--mono: 'Space Mono','Courier New',Courier,monospace`; `--sans: 'Syne','Segoe UI',system-ui,-apple-system,sans-serif`. | Offline/system fallback when Google Fonts fail. |
| lab-ui/src/App.jsx | Global font-size bumps in CSS string: 8px→11px, 9px→11px, 10px→12px, 11px→13px, 12px→13px (hero h1, score-big, mc-title unchanged). | Readability (nav, labels, code, terminal, body text). |
| lab-ui/src/App.jsx | ModuleView: `contentRef.current?.scrollTo?.({ top: 0, behavior: "smooth" })` on step change. | Scroll to top when changing steps. |
| lab-ui/src/App.jsx | ModuleView breadcrumb: "Lab › Module Name › Step Name" (step from `m.steps[step]`). | Context when deep in a module. |
| lab-ui/src/App.jsx | Sidebar: collapse state; `sb.collapsed` (48px width, hide labels/tags/title/sub/badge); toggle button; logo shows 🔐 when collapsed. Transition width 0.2s. | Collapsible sidebar for more content space. |
| lab-ui/src/App.jsx | `resetProgress` with `window.confirm("Reset all progress?")`; Reset button only when sidebar expanded; small/muted. | Safe reset; discoverable but not prominent. |
| lab-ui/src/App.jsx | Version label in sidebar footer: `v1.1.0`. | Version visibility. |
| lab-ui/src/App.jsx | @media (max-width:900px): .cnt padding 28px, .hero padding reduced, .mc-grid single column. @media (max-width:768px): .sb hidden by default; .sb.mobile-open shows as fixed overlay; .main full width; .cnt padding 20px; hamburger button toggles .mobile-open. Nav item click closes mobile menu. | Usable on 13" with terminal side-by-side; mobile menu. |

## Interview Content

| What | Change | Reason |
|------|--------|--------|
| STEPS["0-2"] | Added item: "Sealed Secrets (Bitnami) — Know It Exists" with description (encrypt in Git, vs ESO, compare in interviews). | Awareness of ESO vs Sealed Secrets. |
| MODULES[1].steps | Inserted "Bonus: dataFrom and templating" before "Verify the chain"; added step 1-5 (Verify). | Sixth step in AWS module. |
| STEPS["1-4"] | Replaced with "Bonus: dataFrom and Secret Templating": concept (dataFrom + templating), code (dataFrom + DATABASE_URL template), prod note (5x fewer API calls at scale). | Teach dataFrom and templating. |
| STEPS["1-5"] | New: "Verify the Full Chain" (content moved from former 1-4). | Verify remains after Bonus step. |
| MODULES[5] | steps count 10→13; added "ESO throttling at scale", "When ESO goes down", "IAM permission boundaries". | Three new scenarios. |
| STEPS["5-10"] | New: Scenario 11 — ESO Throttling AWS Secrets Manager (body, scenarioAnswer, prod). | Interview scenario. |
| STEPS["5-11"] | New: Scenario 12 — ESO Pod Crashes (body, scenarioAnswer, prod). | Interview scenario. |
| STEPS["5-12"] | New: Scenario 13 — IAM Permission Boundaries / AccessDenied (body, scenarioAnswer, prod). | Interview scenario. |
| QUIZ | Added question: dataFrom vs data (5 keys, one API call); correct index 1. | dataFrom efficiency. |
| QUIZ | Added question: ESO CrashLoopBackOff, pods with envFrom (keep running); correct index 1. | ESO not in runtime path. |

## Repo Hygiene

| File/Dir | Change | Reason |
|----------|--------|--------|
| Ghost directories | None found (e.g. `{lab-ui/` not present in repo root). | Skipped; nothing to remove. |
| .gitignore | `.DS_Store` already present; added `*.tfvars`, explicit tfstate paths. | Per 1.9. |
| LICENSE | Already exists (MIT, 2025). | No change. |
| CHANGELOG.md | Added [1.1.0] — 2025-02-28 with Fixed, Added, Security. | Document all changes in this pass. |
| package.json (root) | version set to "1.1.0". | Align with lab UI version. |
| README | Root package.json already explained (convenience; app in lab-ui/). | No change. |

## Known Limitations (not fixed in this pass)

- **gavinbunney/kubectl**: Still in use, pinned to `= 1.14.0`. Monitor for ESO CRD schema issues; see provider issues link in main.tf.
- **No remote Terraform backend**: State still ephemeral in CI; add S3 (or equivalent) backend for production use.
- **No e2e tests**: Manual verification only.
