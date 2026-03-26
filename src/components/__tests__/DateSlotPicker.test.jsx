import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DateSlotPicker from '../DateSlotPicker';
import { getAvailabilityForRange } from '@/lib/actions/bookings';

// Mock the action
jest.mock('../../lib/actions/bookings', () => ({
  getAvailabilityForRange: jest.fn(() => Promise.resolve({ success: true, data: {} })),
}));

describe('DateSlotPicker', () => {
  const mockOnDateChange = jest.fn();
  const mockOnSlotChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and opens dialog', async () => {
    render(
      <DateSlotPicker 
        date="2026-01-05" 
        slot="10:00" 
        onDateChange={mockOnDateChange} 
        onSlotChange={mockOnSlotChange} 
      />
    );

    const input = screen.getByPlaceholderText(/Select Date & Time/i);
    fireEvent.click(input);

    await waitFor(() => {
        expect(screen.getByText(/Select Date & Time/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Available Time Windows/i)).toBeInTheDocument();
  });

  it('renders block slots', async () => {
    render(
      <DateSlotPicker 
        date="2026-01-05" 
        slot="10:00" 
        onDateChange={mockOnDateChange} 
        onSlotChange={mockOnSlotChange} 
      />
    );

    fireEvent.click(screen.getByPlaceholderText(/Select Date & Time/i));

    await waitFor(() => {
      expect(screen.getByText('Morning')).toBeInTheDocument();
    });
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    expect(screen.queryByText('Evening')).not.toBeInTheDocument();
  });

  it('keeps evening hidden for non-night services', async () => {
    render(
      <DateSlotPicker 
        date="2026-01-05" 
        slot="" 
        duration={2}
        onDateChange={mockOnDateChange} 
        onSlotChange={mockOnSlotChange} 
      />
    );

    fireEvent.click(screen.getByPlaceholderText(/Select Date & Time/i));

    await waitFor(() => {
      expect(screen.getByText('Morning')).toBeInTheDocument();
    });

    const morningButton = screen.getByText('Morning').closest('button');
    const afternoonButton = screen.getByText('Afternoon').closest('button');

    expect(morningButton).not.toBeDisabled();
    expect(afternoonButton).not.toBeDisabled();
    expect(screen.queryByText('Evening')).not.toBeInTheDocument();
  });

  it('disables slots that overlap with blocked slots', async () => {
    // Non-night bookings now guard only the selected period.
    render(
      <DateSlotPicker 
        date="2026-01-05" 
        slot="" 
        duration={2}
        blockedSlotsMap={{"2026-01-05": ["13:00"]}}
        onDateChange={mockOnDateChange} 
        onSlotChange={mockOnSlotChange} 
      />
    );

    fireEvent.click(screen.getByPlaceholderText(/Select Date & Time/i));

    await waitFor(() => {
      expect(screen.getByText('Afternoon')).toBeInTheDocument();
    });

    const morningButton = screen.getByText('Morning').closest('button');
    const afternoonButton = screen.getByText('Afternoon').closest('button');

    expect(afternoonButton).toBeDisabled();
    expect(morningButton).not.toBeDisabled();
    expect(screen.queryByText('Evening')).not.toBeInTheDocument();
  });

  it('shows the default evening arrival window when total load is 6 or below', async () => {
    render(
      <DateSlotPicker
        date="2026-01-05"
        slot=""
        isNightService
        propertyType="Apartment"
        propertySize="Studio"
        services={["Photography"]}
        onDateChange={mockOnDateChange}
        onSlotChange={mockOnSlotChange}
      />
    );

    fireEvent.click(screen.getByPlaceholderText(/Select Date & Time/i));

    await waitFor(() => {
      expect(screen.getByText('Evening')).toBeInTheDocument();
    });

    expect(screen.getByText(/Arrival 17:00 - 17:30/i)).toBeInTheDocument();
  });

  it('shows an earlier evening arrival window for higher booking load', async () => {
    render(
      <DateSlotPicker
        date="2026-01-05"
        slot=""
        isNightService
        propertyType="Commercial"
        propertySize="Elite"
        services={["Photography", "Videography", "360° Tour"]}
        videographySubService="Daylight + Night"
        onDateChange={mockOnDateChange}
        onSlotChange={mockOnSlotChange}
      />
    );

    fireEvent.click(screen.getByPlaceholderText(/Select Date & Time/i));

    await waitFor(() => {
      expect(screen.getByText('Afternoon')).toBeInTheDocument();
    });

    expect(screen.getByText(/Arrival 14:00 - 14:30/i)).toBeInTheDocument();
  });

  it('keeps the evening label when twilight arrival shifts only to 16:00', async () => {
    render(
      <DateSlotPicker
        date="2026-01-05"
        slot=""
        isNightService
        propertyType="Villa/Townhouse"
        propertySize="6 Bed"
        services={["Videography"]}
        videographySubService="Daylight + Night"
        onDateChange={mockOnDateChange}
        onSlotChange={mockOnSlotChange}
      />
    );

    fireEvent.click(screen.getByPlaceholderText(/Select Date & Time/i));

    await waitFor(() => {
      expect(screen.getByText('Evening')).toBeInTheDocument();
    });

    expect(screen.getByText(/Arrival 16:00 - 16:30/i)).toBeInTheDocument();
  });
});
