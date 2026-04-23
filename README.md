# bitbox-api-ts

A TypeScript library to interact with BitBox hardware wallets.

## API compatibility snapshot test

`test/api-snapshot.test.ts` guards the "drop-in replacement for `bitbox-api`"
while this library is being built up to feature parity

**What it does.** The test parses two `.d.ts` files with the TypeScript
compiler API and diffs their exported shapes:

- `<path-to-rust-api>/bitbox-api-rs/pkg/bitbox_api.d.ts` — the reference (WASM package).
- `dist/index.d.ts` — this package's built output.

For each side it extracts exported **functions**, **classes** (public method
sets + signatures), and **type aliases**, then asserts that:

- Function name sets match exactly, and each function's type signature matches.
- Class name sets match exactly, and each class's public method set +
  signatures match.
- Every type alias the reference exposes is present in the port with the same
  shape. The port is allowed to export *more* than the reference (our type
  aliases are exported; the reference's aren't).

Comparison is on **types only** — parameter names, JSDoc, and comment drift
are normalized away. The test fails only on real call-site compatibility
changes.

**How to run.**

```bash
make test          # runs the full suite, including the snapshot test
```

The snapshot test depends on `dist/index.d.ts`, which is produced by a
Vitest global setup (`test/global-setup.ts`) that runs `tsc -p
tsconfig.build.json` once before tests start.

The test is skipped automatically when the reference `.d.ts` is not
available

**When to drop it.** This file is scaffolding for the port phase. Once the
port reaches feature parity with `bitbox-api` and is shipped stand-alone, the
snapshot test has no further purpose and the file (plus the reference path)
can be deleted.
