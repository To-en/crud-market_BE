// ── UNIT TEST ──────────────────────────────────────────────────────
// Tests ONE module in isolation. Every IO (DB) is faked so this runs
// in milliseconds with no Postgres. If this fails, the bug is in the
// service logic — not the DB, not the network.
//
// ESM MOCKING PATTERN (the important part for "type":"module"):
//   1. jest.unstable_mockModule(path, factory)   ← must run BEFORE import
//   2. const mod = await import(path)            ← dynamic import AFTER mock
// You cannot use the classic `jest.mock()` + top `import` combo in ESM —
// static imports are hoisted and would load the real module first.

import { jest } from "@jest/globals";

// Fake the DB layer. Every model method the service calls must exist here.
const mockIngre = { findAll: jest.fn() };
const mockUser = { findByPk: jest.fn() };

jest.unstable_mockModule("../../src/models/index.js", () => ({
  default: { Ingre: mockIngre, User: mockUser },
}));

// Import the SUT (system under test) AFTER the mock is registered.
const { getGrandTotal, confirmAndDeductBudget } = await import(
  "../../src/services/budget.service.js"
);

// ── describe = group related tests. Nest to mirror the code shape. ──
describe("getGrandTotal", () => {
  // AAA pattern: Arrange → Act → Assert. Keep every test to these 3 beats.
  it("sums unitPrice * qty across ingredients", async () => {
    // Arrange: tell the fake DB what to return
    mockIngre.findAll.mockResolvedValue([
      { id: 1, unitPrice: 10 },
      { id: 2, unitPrice: 25 },
    ]);

    // Act
    const total = await getGrandTotal([1, 2], [3, 2]); // 10*3 + 25*2

    // Assert: the ONE fact this test proves
    expect(total).toBe(80);
  });

  it("rounds the result (money = integer cents/baht)", async () => {
    mockIngre.findAll.mockResolvedValue([{ id: 1, unitPrice: 3.33 }]);
    const total = await getGrandTotal([1], [2]); // 6.66 → round
    expect(total).toBe(7);
  });
});

describe("confirmAndDeductBudget", () => {
  it("deducts grandTotal from user budget", async () => {
    // Fake user instance with an update() spy — mimics a Sequelize row
    const update = jest.fn();
    mockUser.findByPk.mockResolvedValue({ budget: 100, update });

    const remaining = await confirmAndDeductBudget({ userId: 1, grandTotal: 30 });

    expect(remaining).toBe(70);
    expect(update).toHaveBeenCalledWith({ budget: 70 }); // side-effect verified
  });

  // EDGE CASES are the whole point of unit tests — test the error paths.
  it("throws when budget would go negative", async () => {
    mockUser.findByPk.mockResolvedValue({ budget: 20, update: jest.fn() });
    // rejects.toThrow = assert an async function throws
    await expect(
      confirmAndDeductBudget({ userId: 1, grandTotal: 50 })
    ).rejects.toThrow("Insufficient budget");
  });

  it("throws when user not found", async () => {
    mockUser.findByPk.mockResolvedValue(null);
    await expect(
      confirmAndDeductBudget({ userId: 999, grandTotal: 10 })
    ).rejects.toThrow("User not found");
  });
});
