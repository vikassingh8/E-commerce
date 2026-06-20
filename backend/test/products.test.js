import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { products } from "../products.js";

describe("Products catalogue", () => {
  it("has at least 8 products", () => {
    assert.ok(products.length >= 8, "expected a populated catalogue");
  });

  it("each product has the required fields", () => {
    for (const p of products) {
      assert.ok(p.id, "missing id");
      assert.ok(p.name, "missing name");
      assert.ok(p.category, "missing category");
      assert.ok(p.price > 0, "price must be positive");
      assert.ok(p.rating >= 0 && p.rating <= 5, "rating must be 0-5");
      assert.ok(p.stock >= 0, "stock must not be negative");
    }
  });

  it("product ids are unique", () => {
    const ids = new Set(products.map((p) => p.id));
    assert.equal(ids.size, products.length);
  });
});
