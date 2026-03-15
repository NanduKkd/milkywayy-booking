import { render, screen, fireEvent, waitFor } from '../../../../test-utils';
import BookingsPage from '../page';
import { completeBooking } from '../../../../lib/actions/bookings';

// Mock global fetch
global.fetch = jest.fn();

const mockBookings = [
  {
    id: 1,
    date: '2025-12-25',
    total: 500,
    status: 'CONFIRMED',
    propertyDetails: { unit: '101', building: 'Tower A', community: 'Marina' },
    transaction: { status: 'success', amount: 500 },
    shootDetails: { services: ['Photography'] },
    user: { fullName: 'Test User', email: 'test@example.com', phone: '123456' },
  },
];

describe('Admin Bookings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockImplementation((url) => {
      if (url === '/api/admin/bookings') {
        return Promise.resolve({
          json: async () => mockBookings,
        });
      }
      return Promise.resolve({
        json: async () => ({}),
      });
    });
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    // Mock window.alert
    window.alert = jest.fn();
  });

  it('renders bookings table after fetching', async () => {
    render(<BookingsPage />);
    expect(await screen.findByText('101, Tower A, Marina')).toBeInTheDocument();
    expect(screen.getByText('AED 500')).toBeInTheDocument();
  });

  it('opens dialog when row is clicked', async () => {
    render(<BookingsPage />);
    const row = await screen.findByText('101, Tower A, Marina');
    fireEvent.click(row);
    expect(screen.getByText(/booking details #1/i)).toBeInTheDocument();
  });

  it('handles mark as completed', async () => {
    completeBooking.mockResolvedValue({ success: true });
    render(<BookingsPage />);
    
    const row = await screen.findByText('101, Tower A, Marina');
    fireEvent.click(row);
    
    const completeButton = screen.getByRole('button', { name: /mark as completed/i });
    fireEvent.click(completeButton);
    
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(completeBooking).toHaveBeenCalledWith(1);
    });
    expect(window.alert).toHaveBeenCalledWith('Booking marked as completed');
  });

  it('handles file upload for completed booking', async () => {
    const completedBooking = { ...mockBookings[0], status: 'COMPLETED' };
    
    global.fetch.mockImplementation((url, init) => {
      if (url === '/api/admin/bookings') {
        return Promise.resolve({
          json: async () => [completedBooking],
        });
      }
      if (url === '/api/admin/upload' && init?.method === 'POST') {
        return Promise.resolve({
          json: async () => ({
            url: 'https://s3.example.com/file-1.jpg',
            urls: [
              'https://s3.example.com/file-1.jpg',
              'https://s3.example.com/file-2.jpg',
            ],
          }),
        });
      }
      return Promise.resolve({
        json: async () => ({}),
      });
    });

    render(<BookingsPage />);
    
    const row = await screen.findByText('101, Tower A, Marina');
    fireEvent.click(row);
    
    // Check if upload section is visible
    expect(screen.getByText(/Files/i)).toBeInTheDocument();
    
    // In JSDOM, portals are rendered into document.body
    const fileInput = document.querySelector('input[type="file"]');
    const fileOne = new File(['test'], 'test-1.jpg', { type: 'image/jpeg' });
    const fileTwo = new File(['test'], 'test-2.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [fileOne, fileTwo] } });
    
    expect(screen.getByText('2 file(s) selected')).toBeInTheDocument();

    const uploadButton = screen.getByRole('button', { name: /upload deliverable/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/upload', expect.objectContaining({
        method: 'POST',
      }));
    });
    
    expect(window.alert).toHaveBeenCalledWith('2 file(s) uploaded successfully');
  });
});
