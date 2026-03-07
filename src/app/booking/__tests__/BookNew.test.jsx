import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookNew from '../BookNew';
import { PRICING_CONFIG } from '@/lib/config/pricing';

// Mocks
jest.mock('../../../lib/contexts/auth', () => ({
  useAuth: jest.fn(() => ({
    authState: { isAuthenticated: true },
    login: jest.fn(),
  })),
}));

jest.mock('../../../lib/actions/bookings', () => ({
  createBookings: jest.fn(() => Promise.resolve({ success: true, data: [1] })),
  createTransactionAndPaymentIntent: jest.fn(() => Promise.resolve({ success: true, data: { url: 'http://test.com' } })),
  getDrafts: jest.fn(() => Promise.resolve({ success: true, data: [] })),
  saveDrafts: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('../../../lib/actions/coupons', () => ({
  validateCoupon: jest.fn(() => Promise.resolve({ success: true, data: { valid: true, discount: 50 } })),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../../../lib/helpers/bookingUtils', () => ({
  calculateBookingDuration: jest.fn(() => 5),
  getAvailableSlots: jest.fn(() => []),
}));

jest.mock('../../../components/StarBackground', () => function StarBackground() { return <div data-testid="star-background" />; });

jest.mock('../components/PropertyCard', () => ({
  PropertyCard: ({ index, control, onRemove, updatePropertyField, property, setValue }) => {
    const { Controller } = require('react-hook-form');
    return (
      <div data-testid={`property-card-${index}`}>
        <input 
          data-testid={`type-${index}`} 
          onChange={(e) => updatePropertyField(index, 'propertyType', e.target.value)}
        />
        <input 
          data-testid={`size-${index}`} 
          onChange={(e) => updatePropertyField(index, 'propertySize', e.target.value)}
        />
        <button 
          data-testid={`add-service-${index}`} 
          onClick={() => updatePropertyField(index, 'services', ['Photography'])}
        >
          Add Service
        </button>
        <div data-testid={`duration-${index}`}>{property.duration}</div>
        <button type="button" onClick={() => onRemove(index)} data-testid={`remove-${index}`}>Remove</button>
      </div>
    );
  },
}));

jest.mock('../components/PaymentStep', () => ({
  PaymentStep: ({ onBack, handleFinalSubmit }) => (
    <div data-testid="payment-step">
      <button onClick={onBack}>Back</button>
      <button onClick={handleFinalSubmit}>Pay</button>
    </div>
  ),
}));

jest.mock('../components/PricingSummary', () => ({
  PricingSummary: ({ totalAmount }) => <div data-testid="pricing-summary">Total: {totalAmount}</div>,
}));

// Helper to create a promise that behaves like a resolved resource for React.use
const createFulfilledPromise = (data) => {
  const promise = Promise.resolve(data);
  promise.status = 'fulfilled';
  promise.value = data;
  return promise;
};

describe('BookNew', () => {
  const mockPricingsPromise = createFulfilledPromise({ success: true, data: PRICING_CONFIG });
  const mockDiscountsPromise = createFulfilledPromise({ success: true, data: [] });

  it('renders correctly and loads drafts', async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew pricingsPromise={mockPricingsPromise} discountsPromise={mockDiscountsPromise} />
      </Suspense>
    );

    // Initial render should show one property card (default)
    await waitFor(() => {
      expect(screen.getByTestId('property-card-0')).toBeInTheDocument();
    });

    expect(screen.getByText(/Book Your Shoot/i)).toBeInTheDocument();
  });

  it('adds a new property', async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew pricingsPromise={mockPricingsPromise} discountsPromise={mockDiscountsPromise} />
      </Suspense>
    );

    await waitFor(() => expect(screen.getByTestId('property-card-0')).toBeInTheDocument());

    const addButton = screen.getByText(/Add Another Property/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('property-card-1')).toBeInTheDocument();
    });
  });

  it('removes a property', async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew pricingsPromise={mockPricingsPromise} discountsPromise={mockDiscountsPromise} />
      </Suspense>
    );

    await waitFor(() => expect(screen.getByTestId('property-card-0')).toBeInTheDocument());
    
    // Add a second property first (cannot remove if only 1)
    fireEvent.click(screen.getByText(/Add Another Property/i));
    await waitFor(() => expect(screen.getByTestId('property-card-1')).toBeInTheDocument());

    // Remove the second property
    fireEvent.click(screen.getByTestId('remove-1'));

    await waitFor(() => {
      expect(screen.queryByTestId('property-card-1')).not.toBeInTheDocument();
    });
  });

  it('updates duration when property details change', async () => {
    const { calculateBookingDuration } = require('../../../lib/helpers/bookingUtils');
    calculateBookingDuration.mockReturnValue(7);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew pricingsPromise={mockPricingsPromise} discountsPromise={mockDiscountsPromise} />
      </Suspense>
    );

    await waitFor(() => expect(screen.getByTestId('property-card-0')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('type-0'), { target: { value: 'Villa' } });
    fireEvent.change(screen.getByTestId('size-0'), { target: { value: '4 Bedroom' } });
    fireEvent.click(screen.getByTestId('add-service-0'));
    
    await waitFor(() => {
      expect(screen.getByTestId('duration-0')).toHaveTextContent('7');
    });
    expect(calculateBookingDuration).toHaveBeenCalled();
  });
});
