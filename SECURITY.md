# Security Policy

## Project Status

PT Lingo is currently in active development by an individual developer as a personal NPTE exam preparation tool. It is not yet commercially deployed to a general audience. This security policy will be updated as the project matures.

---

## Supported Versions

| Version | Supported |
|---|---|
| `main` branch (latest) | ✅ Active |
| Older commits | ❌ Not supported |

All security fixes are applied to the `main` branch only.

---

## Scope

The following are in scope for security reports:

- Authentication flows (email/password, passkey, Google OAuth)
- Supabase Row-Level Security policy bypasses
- Session handling and JWT management
- Anonymous sign-in upgrade path (anonymous → registered user)
- Question bank data exposure
- User-generated content (notes, study plans) data leakage
- Client-side secrets or API key exposure in the JavaScript bundle

The following are **out of scope**:

- Vulnerabilities in third-party dependencies where no fix is available upstream (e.g., the `lottie-web` eval warning)
- The Vite development server (dev-only, not exposed in production)
- Rate limiting and brute-force protection (Supabase handles this at the platform level)
- Social engineering
- Physical security

---

## Reporting a Vulnerability

PT Lingo does not yet have a HackerOne program or bug bounty. To report a vulnerability:

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, use one of the following:

1. **GitHub Private Vulnerability Reporting** — go to the [Security tab](https://github.com/silentius-satoshi/ptlingo/security) of this repository and select "Report a vulnerability." This is the preferred channel.

2. **Email** — if GitHub private reporting is unavailable, contact the maintainer directly. Check the repository's public profile for contact information.

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- The potential impact
- Any suggested remediation if known

---

## Response Expectations

This is a solo-maintained project. Response times reflect that:

| Severity | Target Response | Target Fix |
|---|---|---|
| Critical (auth bypass, data exposure) | 48 hours | 7 days |
| High | 5 days | 30 days |
| Moderate | 14 days | 90 days |
| Low / Informational | Best effort | No commitment |

These are targets, not guarantees. Critical vulnerabilities affecting real user data will be prioritized regardless of other development work.

---

## Known Issues

- **`lottie-web` eval usage** — the lottie-web animation library uses `eval()` internally. This is a known upstream issue with no current fix available. It does not affect the production security surface. Tracked for removal or replacement post-commercial launch.

- **Bundle size** — the current JavaScript bundle exceeds 2 MB uncompressed. This is a performance issue, not a security issue. Addressed in future optimization work.

---

## Disclosure Policy

PT Lingo follows **coordinated disclosure**. Reporters are asked to:

1. Report privately using the channels above
2. Allow reasonable time for a fix to be developed and deployed before public disclosure
3. Not exploit the vulnerability beyond what is necessary to demonstrate the issue

In return, the maintainer will:

1. Acknowledge receipt within the target response window
2. Keep the reporter informed of fix progress
3. Credit the reporter in the fix commit or release notes (unless anonymity is requested)

---

## Security Architecture Notes

For transparency, the following are relevant to PT Lingo's security model:

- **Authentication**: Managed by [Supabase Auth](https://supabase.com/docs/guides/auth). Email/password, Google OAuth, and FIDO2 passkeys are supported.
- **Data isolation**: All user data is protected by Supabase Row-Level Security policies. Users can only access their own rows.
- **Anonymous users**: Supabase anonymous sign-in is used for the guest/demo flow. Anonymous sessions are scoped to the `authenticated` role with the same RLS policies as registered users.
- **API keys**: The Supabase anon key is intentionally public (this is by design — RLS policies provide the security boundary). The service role key is never exposed client-side.
- **AI integrations**: The Anthropic API key (used for study plan generation) and OpenRouter key (used for the AI tutor) are accessed via environment variables and are never included in the client bundle.
- **Question bank**: The question bank is read-only for all users. No user can write to the `questions` table.
