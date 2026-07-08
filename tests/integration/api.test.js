// ── INTEGRATION TEST ───────────────────────────────────────────────
// Tests real wiring: HTTP request → express router → controller.
// supertest boots the app in-process (no real port) and fires requests.
//
// PREREQUISITE (one-line refactor in src/main.js):
//   main.js currently calls app.listen() at import time — importing it
//   from a test would start a real server. Split it:
//
//     export const app = express();   // build app, mount routes...
//     // move app.listen(PORT) into a `if (import.meta.url === ...)` guard
//     // OR a separate src/server.js that imports app and listens.
//
//   Then uncomment the import below. Until then this file is skipped.

import { describe, it, expect } from "@jest/globals";
import request from "supertest";
// import { app } from "../../src/main.js";   // ← enable after exporting app

// describe.skip = registered but not run. Remove `.skip` once app is exported.
describe.skip("GET /health", () => {
  it("returns 200 + status ok (liveness — no DB touched)", async () => {
    // request(app) wraps the express app; no listen(), no port binding
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

// Integration tests that hit the DB need a REAL test database (or a
// throwaway Postgres container in CI). Pattern:
//   beforeAll → connect + migrate + seed
//   afterEach → truncate tables (isolate tests)
//   afterAll  → close connection
// Keep these OUT of the unit run — they are slow and need infra.
describe.skip("GET /api/ingredients (needs test DB)", () => {
  it("returns seeded ingredients", async () => {
    const res = await request(app).get("/api/ingredients");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
