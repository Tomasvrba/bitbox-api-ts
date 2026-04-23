// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';

export default function setup(): void {
  execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
}
