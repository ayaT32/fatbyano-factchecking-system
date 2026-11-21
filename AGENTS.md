<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep verification input, claims archive/detail, reports, and analytics as separate authenticated TanStack routes so each staff workflow has a shareable URL.
- Reuse the existing checkClaim server function for AI checks and the user-scoped client for claims, report, and attachment reads/writes so existing access policies remain authoritative.
- Keep client-safe analysis parsing, exports, and aggregates in src/lib/desk.ts and shared result/report controls in components so screens interpret saved research consistently.
- Keep remote agent tools read-only in src/lib/mcp, authenticated by the managed OAuth issuer with client-claim verification and caller-scoped database access; this preserves existing staff access policies.
- Preserve canonical local OAuth return paths through all auth methods; this lets assistant consent survive sign-in and email verification without external redirects.
- Register browser archive tools in their owning screen with shared visible-record actions and fail-open static telemetry; this preserves filters and normal navigation while removing tools on unmount.
- Keep investigation chats owner-only with route-derived IDs and persisted AI SDK messages; use the authenticated streaming endpoint for research and retain checkClaim for explicit saved verification.
- Image manipulation and geolocation chat tools provide qualitative visual assessments, not forensic certification or confirmed coordinates; only enabled tools may execute on uploaded imagery.
