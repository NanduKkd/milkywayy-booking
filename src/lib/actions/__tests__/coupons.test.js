import { validateCoupon } from '../coupons';
import Booking from '@/lib/db/models/booking';
import Transaction from '@/lib/db/models/transaction';
import { auth } from '@/lib/helpers/auth';

jest.unmock('../coupons');
jest.unmock('@/lib/actions/utils');

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/db/models/booking', () => ({
  count: jest.fn(),
}));

jest.mock('@/lib/db/models/coupon', () => ({
  findOne: jest.fn(),
}));

jest.mock('@/lib/db/models/transaction', () => ({}));

jest.mock('@/lib/helpers/auth', () => ({
  auth: jest.fn(),
}));

describe('Coupon Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 'user-123' });
    Booking.count.mockResolvedValue(0);
  });

  it('keeps launch promo valid when no successful paid booking exists', async () => {
    const result = await validateCoupon('LAUNCH500', 700);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        valid: true,
        discount: 500,
      }),
    );
    expect(Booking.count).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      include: [
        {
          model: Transaction,
          as: 'transaction',
          required: true,
          where: { status: 'success' },
        },
      ],
    });
  });

  it('rejects launch promo when user already has a successful paid booking', async () => {
    Booking.count.mockResolvedValue(1);

    const result = await validateCoupon('LAUNCH500', 700);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        valid: false,
        message: 'Launch credit is valid only for your first booking',
      }),
    );
  });
});
