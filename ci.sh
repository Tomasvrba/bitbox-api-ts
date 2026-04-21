#!/usr/bin/env bash

# SPDX-License-Identifier: Apache-2.0

# Runs the full validation pipeline. Called both by CI and by `make ci`
# so the two stay identical.

set -euo pipefail

cd "$(dirname "$0")"

if [ "${CI:-}" = "true" ]; then
    npm ci
fi

npm run proto:check
npm run typecheck
npm run lint
npm test
npm run build
