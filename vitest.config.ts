import { configDefaults, defineConfig } from 'vitest/config';

// The simulator suite spawns real binaries and downloads cached fixtures.
// `npm test` stays fast and dependency-free by excluding it; `npm run test:sim`
// opts in by setting SIMULATOR_TESTS=1.
const includeSimulator = process.env.SIMULATOR_TESTS === '1';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: [
      ...configDefaults.exclude,
      ...(includeSimulator ? [] : ['test/simulator-info.test.ts']),
    ],
    environment: 'node',
    passWithNoTests: true,
    globalSetup: ['./test/global-setup.ts'],
  },
});
