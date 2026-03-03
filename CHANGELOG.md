# Changelog

All notable changes to this project are documented here. Re-clone or pull to get the latest lab content and fixes.

## [1.1.0] — 2025-02-28

### Fixed
- Terraform: Pinned `gavinbunney/kubectl` to `= 1.14.0` with comment; fixed IAM trust policy for non-EKS (lab use) to allow account root with clear comment; `cluster_context` empty by default, only set when non-empty in providers; time_sleep for ESO CRDs increased to 30s.
- Lab UI: Font sizes increased (8→11px, 9→11px, 10→12px, 11→13px, 12→13px) for readability; scroll-to-top on step navigation; breadcrumb shows Module › Step; Reset Progress with confirmation.

### Added
- Terraform: `random_password_value` sensitive output; `*.tfvars` and explicit tfstate paths in `.gitignore`; random provider ~> 3.6.
- Lab UI: Google Fonts (Space Mono, Syne) with system fallbacks; collapsible sidebar (chevron toggle); breadcrumb in ModuleView; mobile breakpoints (≤768px hamburger + overlay sidebar, ≤900px single column + reduced padding); version badge v1.1.0 in sidebar.
- Interview: Three new scenarios (5-10 ESO throttling, 5-11 ESO pod crashes, 5-12 IAM permission boundaries); two new quiz questions (dataFrom, ESO down); Sealed Secrets note in Tools Overview; Bonus step 1-5 (dataFrom and Secret templating) in AWS module.

### Security
- Outputs `secret_arn`, `eso_role_arn` (and `random_password_value`) marked sensitive to avoid leaking in CI logs.

---

## [1.0.0] — 2025-02-28

- Initial release: interactive lab for Kubernetes secrets with AWS Secrets Manager, Azure Key Vault, Terraform, ESO, rotation, and CI/CD.
- Manual deploy guide (Kind, MicroK8s, EKS) in DEPLOY.md.
- Interview quiz with shuffled questions and scenario-based questions.
- Full flow recap and ESO-down resilience note.

---

When we ship updates (new modules, quiz questions, or fixes), they will be listed here with the version number shown in the lab UI sidebar.
