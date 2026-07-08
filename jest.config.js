// ESM project ("type":"module") -> jest needs experimental VM modules.
// The `test` script sets NODE_OPTIONS=--experimental-vm-modules (see package.json).
// transform:{} = disable Babel; run raw ESM as-is (no transpile step needed on Node 24).
export default {
  testEnvironment: "node",
  transform: {},
  // Split runs: `jest unit` / `jest integration` via path. Both picked up by default.
  testMatch: ["**/tests/**/*.test.js"],
  // Unit tests must not touch real DB — integration ones opt in explicitly.
  clearMocks: true, // reset mock call-history between tests (no cross-test bleed)
};

// jest.config.js
export default {
  testEnvironment: 'node',              // ── environment ──
  // test file located in ./tests/*.test.js
  testMatch: ['**/*.test.js'],     

  setupFilesAfterEnv: ['./jest.setup.js'], // ── setup ──

  // Test coverage mean that
  collectCoverage: true,                
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80 }
  },

  // Alias for module name export
  moduleNameMapper: {              
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {                          // ── transform (TS) ──
    '^.+\\.tsx?$': 'ts-jest'
  }
};