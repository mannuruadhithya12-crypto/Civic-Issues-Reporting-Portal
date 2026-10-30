import { render, screen } from '@testing-library/react';
import App from './App';

test('renders CivicConnect application header', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/CivicConnect/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
