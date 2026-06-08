import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

const mockProducts = [
  { id: 1, name: 'Laptop', price: 80000 },
  { id: 2, name: 'Phone', price: 30000 },
];

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve(mockProducts) })
  );
});

describe('App', () => {
  it('renders the store heading', async () => {
    render(<App />);
    expect(screen.getByText(/E-Commerce Store/i)).toBeInTheDocument();
  });

  it('displays products fetched from the API', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
    });
  });

  it('shows prices in rupees', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('₹80000')).toBeInTheDocument();
      expect(screen.getByText('₹30000')).toBeInTheDocument();
    });
  });

  it('fetches from the /api/products endpoint', async () => {
    render(<App />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/products');
    });
  });
});
