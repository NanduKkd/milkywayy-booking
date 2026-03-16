import { render, screen, fireEvent, waitFor } from '../../../../test-utils';
import CouponManager from '../CouponManager';
import { createCoupon, deleteCoupon, toggleCouponStatus } from '../../../../lib/actions/coupons';
import { useRouter } from 'next/navigation';

const mockCoupons = [
  {
    id: 1,
    code: 'SAVE10',
    percentDiscount: 10,
    maxDiscount: 100,
    minimumAmount: 500,
    uiText: 'Save on your first order',
    isActive: true,
  },
  {
    id: 'system-LAUNCH500',
    code: 'LAUNCH500',
    percentDiscount: null,
    maxDiscount: 500,
    minimumAmount: 500,
    uiText: 'AED 500 welcome credit on your first booking.',
    isActive: true,
    isSystem: true,
    eligibilityLabel: 'First booking only',
  },
];

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('CouponManager', () => {
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ refresh: mockRefresh });
    createCoupon.mockResolvedValue({ success: true });
    deleteCoupon.mockResolvedValue({ success: true });
    toggleCouponStatus.mockResolvedValue({ success: true });
    
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  it('renders coupon list', () => {
    render(<CouponManager initialCoupons={mockCoupons} />);
    expect(screen.getByText('SAVE10')).toBeInTheDocument();
    expect(screen.getByText('Save on your first order')).toBeInTheDocument();
    expect(screen.getByText('10% OFF')).toBeInTheDocument();
    expect(screen.getByText('LAUNCH500')).toBeInTheDocument();
    expect(screen.getByText('AED 500 CREDIT')).toBeInTheDocument();
    expect(
      screen.getByText('AED 500 welcome credit on your first booking.'),
    ).toBeInTheDocument();
    expect(screen.getByText('First booking only')).toBeInTheDocument();
    expect(screen.getByText('Managed in backend')).toBeInTheDocument();
  });

  it('handles delete coupon', async () => {
    render(<CouponManager initialCoupons={mockCoupons} />);
    const deleteButton = screen.getByTitle('Delete coupon');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(deleteCoupon).toHaveBeenCalledWith(1);
    });
  });

  it('handles create coupon', async () => {
    render(<CouponManager initialCoupons={[]} />);
    
    fireEvent.click(screen.getByText(/Create Coupon/i));
    
    fireEvent.change(screen.getByLabelText(/Coupon Code/i), { target: { value: 'WELCOME' } });
    fireEvent.change(screen.getByLabelText(/Discount Percentage/i), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/Max Discount/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/Min Spend/i), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText(/UI Text/i), { target: { value: 'Visible on UI' } });
    
    // Click the button in the dialog footer
    const createButtons = screen.getAllByRole('button', { name: /Create Coupon/i });
    fireEvent.click(createButtons[createButtons.length - 1]);
    
    await waitFor(() => {
      expect(createCoupon).toHaveBeenCalledWith(expect.objectContaining({
        code: 'WELCOME',
        percentDiscount: '15',
        uiText: 'Visible on UI',
      }));
    });
  });
});
