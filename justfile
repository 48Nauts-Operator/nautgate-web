# nautgate-web — landing site for nautgate.dev
# Run `just` to see all recipes; `just <recipe>` to execute.

REPO := "48Nauts/nautgate-web"
FORGEJO_BASE := "http://cosmos.tail138398.ts.net:3000"

default:
    @just --list

# ─── Push / sync ────────────────────────────────────────────────

push:
    git push forgejo
    git push origin

push-forgejo:
    git push forgejo

push-github:
    git push origin

pull:
    git pull --rebase forgejo

# ─── Open in browser ────────────────────────────────────────────

open:
    open "{{FORGEJO_BASE}}/{{REPO}}"

ci:
    open "{{FORGEJO_BASE}}/{{REPO}}/actions"

issues:
    open "{{FORGEJO_BASE}}/{{REPO}}/issues"

prs:
    open "{{FORGEJO_BASE}}/{{REPO}}/pulls"

# ─── Branch helpers (auto-open tracking issue on push) ──────────

feature name:
    git checkout -b feature/{{name}}

fix-branch name:
    git checkout -b fix/{{name}}

# ─── Static site: serve + check ─────────────────────────────────

# No build step by design — these are the files that ship.
serve:
    python3 -m http.server 4321

check:
    node scripts/check.mjs http://localhost:4321
