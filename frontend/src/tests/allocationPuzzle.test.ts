import { describe, expect, it } from "vitest";
import { solveAllocation, type PuzzleItem, type PuzzleReceiver } from "../lib/allocationPuzzle";

const items: PuzzleItem[] = [
  { id: "rice", name: "Rice", diet: "VEG", servings: 30 },
  { id: "chicken", name: "Chicken", diet: "NON_VEG", servings: 60 },
];

const receiver = (id: string, eligible_items: string[], overrides: Partial<PuzzleReceiver> = {}): PuzzleReceiver => ({
  id, name: id, capacity: 60, volunteers: null, refrigeration: true, pickup_minutes: 10,
  eligible_items, ...overrides,
});

describe("donor allocation puzzle", () => {
  it("moves flexible food to a different NGO to maximize total allocated", () => {
    const plan = solveAllocation(items, [receiver("A", ["rice", "chicken"]), receiver("B", ["rice"])], false, 20);
    expect(plan.unallocated).toEqual([]);
    expect(plan.allocations.map(row => row.items.map(({ id, servings }) => ({ id, servings })))).toEqual([
      [{ id: "chicken", servings: 60 }], [{ id: "rice", servings: 30 }],
    ]);
  });

  it("recomputes when storage, volunteer, timing and dietary requirements change", () => {
    const receivers = [
      receiver("A", ["rice", "chicken"], { diet: "VEG", volunteers: 15 }),
      receiver("B", ["chicken"], { refrigeration: false }),
      receiver("C", ["rice", "chicken"], { latestPickup: 5 }),
    ];
    const plan = solveAllocation(items, receivers, true, 20);
    expect(plan.allocations.map(row => row.items.reduce((sum, item) => sum + item.servings, 0))).toEqual([15, 0, 0]);
    expect(plan.unallocated.map(item => item.servings)).toEqual([15, 60]);
    expect(solveAllocation(items, receivers, false, 20).unallocated.map(item => item.servings)).toEqual([15]);
    expect(solveAllocation(items, receivers, false, 5).unallocated).toEqual(items);
  });
});
