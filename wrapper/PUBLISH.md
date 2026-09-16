# PUBLISH.md — do NOT publish yet (checklist for later)

Order matters: publish `@benchmaxxing/charts` FIRST, then this wrapper.

## 1. @benchmaxxing/charts

- [ ] `npm run build && npm test` green on main.
- [ ] Bump version in root `package.json` (keep `wrapper/package.json`
      dependency pin in sync: `"@benchmaxxing/charts": "<same>"`).
- [ ] `npm publish --access public` from the repo root (dry-run first:
      `npm publish --dry-run`).
- [ ] Verify: `npm view @benchmaxxing/charts version` shows the new version.

## 2. wrapper (`benchmaxxing`)

- [ ] Step 1 done and visible on the registry (wrapper installs it).
- [ ] `cd wrapper && npm install` resolves `@benchmaxxing/charts` cleanly.
- [ ] Smoke test: `npx --prefix <tmp-install> benchmaxxing --help`
      prints the charts CLI help (proves the passthrough works).
- [ ] `npm publish --access public` from `wrapper/` (dry-run first).
- [ ] Verify: `npx -y benchmaxxing@latest --help` works in an empty dir.

## Notes

- Both packages are MIT, engines `node >= 20`, no runtime dependencies
  beyond the wrapper → charts link.
- Never publish a wrapper version whose pinned charts version is not
  already live — installs would break.
