import { describe, it } from "node:test";
import assert from "node:assert/strict";

const products = [
  { id: 1, name: "Laptop", price: 80000 },
  { id: 2, name: "Phone", price: 30000 },
];

describe("Products data", () => {
  it("should have 2 products", () => {
    assert.equal(products.length, 2);
  });

  it("each product should have id, name, and price", () => {
    for (const p of products) {
      assert.ok(p.id, "missing id");
      assert.ok(p.name, "missing name");
      assert.ok(p.price > 0, "price must be positive");
    }
  });

  it("Laptop price should be 80000", () => {
    const laptop = products.find((p) => p.name === "Laptop");
    assert.equal(laptop.price, 80000);
  });
});
