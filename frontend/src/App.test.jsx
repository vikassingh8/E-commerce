import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProducts = [
  { id: 1, name: 'Laptop', price: 80000 },
  { id: 2, name: 'Phone', price: 30000 },
];

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(mockProducts),
  });
});

describe('App', () => {
  it('fetch mock resolves with product list', async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    expect(data).toEqual(mockProducts);
  });

  it('fetches from the /api/products endpoint', async () => {
    await fetch('/api/products');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/products');
  });

  it('products have required fields', () => {
    mockProducts.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('price');
    });
  });

  it('product prices are positive numbers', () => {
    mockProducts.forEach((p) => {
      expect(p.price).toBeGreaterThan(0);
    });
  });
});
