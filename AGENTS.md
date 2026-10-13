You can find doc for @redwoodjs/ packages online at https://cedarjs.com/docs/8.x/introduction You can find doc for
React Router (framework mode) online at https://reactrouter.com/ and for Apollo's React Router integration at
https://www.apollographql.com/docs/react/integrations/react-router

## rwgql Direction

rwgql is an early proof of concept for a new RedwoodJS GraphQL path that can migrate block by block from a classic
RedwoodJS (Cedar) app.

- Use `README.md` as the source of truth for product direction, architecture, package intent, and parity goals.
- Treat `test-apps/` as demo / PoC applications that prove the packages working together end-to-end.
- Treat `packages/` as the WIP "framework" / SDK surface. Each package should keep dependencies minimal, expose focused
  primitives, and work in isolation when its direct peer requirements are present.
- Prefer package boundaries that let users adopt one block at a time. For example, `@rwgql/cell` should work with
  Apollo Client, `@rwgql/router` should require only React Router (plus Babel for codegen), and
  `@cedarjs/pg` should work anywhere Vite Task / Vitest is available. App-local Prisma glue (prepare `.env`,
  migrate/generate tasks, Vitest migrate hook) lives in the db / graphql test apps — not a second Postgres layer.
- Use [migrating-from-redwoodjs.md](migrating-from-redwoodjs.md) and GitHub parity issues for Cedar → rwgql
  migration guidance; do not recreate a full classic Redwood app in-tree unless the task is explicitly about parity.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Cursor Cloud specific instructions

The Vite+ CLI (`vp`) is pre-installed in the VM snapshot and symlinked at `/usr/local/bin/vp` (so it is on `PATH` in
non-login shells). The startup update script runs `vp install`. Standard commands (`vp check`, `vp test`,
`vp run -r build`, `vp run dev`) are documented in `README.md`.

### Running the stack

`vp run dev` builds packages, acquires a worktree-scoped Postgres via `@cedarjs/pg` (autopg host), migrates + seeds,
then runs the web app and the GraphQL/auth server in parallel (see `README.md` for the exact ports and URLs). Run it
under tmux since it is long-lived. Install `@cedarjs/pg` from the npm `alpha` dist-tag (`0.2.0-alpha.0`). The GraphQL
`posts` query is public; `contacts`/`users` are behind the `requireAuth` directive, so query them only with a
logged-in session.

### Tests

`vp test` includes browser-mode (Vitest + Playwright) tests for React components, which require the Playwright Chromium
browser. Install it once if missing (it persists in the snapshot under `~/.cache/ms-playwright`):

```bash
node node_modules/.pnpm/playwright@*/node_modules/playwright/cli.js install chromium
```

`npx playwright ...` fails here because the repo pins pnpm via `devEngines`; invoke the CLI via `node ...` (above) or
`pnpm`.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:46cd31e7 -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**

- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.

<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->

## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
