import {
  cancelBookingBySessionId,
  createBookings,
  createTransactionAndPaymentIntent,
} from '../bookings';
import Booking from '@/lib/db/models/booking';
import { Op } from 'sequelize';

// Unmock the module under test because it is globally mocked in jest.setup.js
jest.unmock('../bookings');
jest.unmock('@/lib/actions/utils'); // unmock utils too just in case

import Transaction from '@/lib/db/models/transaction';
import User from '@/lib/db/models/user';
import { auth } from '@/lib/helpers/auth';
import { getPricingConfig } from '@/lib/helpers/pricing';
import { getDiscounts } from '@/lib/actions/discounts';
import Stripe from 'stripe';

// Mock dependencies that cause side effects or DB connections
jest.mock('@/lib/db/relations', () => ({}));
jest.mock('@/lib/db/db', () => ({
  sequelize: {
    define: jest.fn(() => ({})),
    transaction: jest.fn(),
    models: {
      User: {},
      Transaction: {},
    }
  }
}));

jest.mock('@/lib/db/models/booking', () => ({
  findAll: jest.fn(),
  count: jest.fn(),
  destroy: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));

jest.mock('@/lib/db/models/transaction', () => ({
  create: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock('@/lib/db/models/dynamicconfig', () => ({
  findOne: jest.fn(),
}));

jest.mock('@/lib/db/models/user', () => ({
  findByPk: jest.fn(),
}));

jest.mock('@/lib/db/models/wallettransaction', () => ({
  create: jest.fn(),
}));

jest.mock('@/lib/db/models/coupon', () => ({
  findOne: jest.fn(),
}));

jest.mock('@/lib/helpers/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/helpers/pricing', () => ({
  getPricingConfig: jest.fn(),
}));

jest.mock('@/lib/actions/discounts', () => ({
  getDiscounts: jest.fn(),
}));

jest.mock('stripe', () => {
  const create = jest.fn();
  const mockStripe = jest.fn(() => ({
    checkout: {
      sessions: {
        create
      }
    }
  }));
  mockStripe.mockCreateSession = create;
  return mockStripe;
});

describe('Booking Actions', () => {
  const mockUserId = 'user-123';
  const mockFutureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const mockProperties = [
    {
      propertyType: 'Apartment',
      propertySize: '1 Bed',
      services: ['Photography'],
      preferredDate: mockFutureDate,
      startTime: '10:00',
      duration: 2,
      building: 'Tower A',
      community: 'Downtown',
      unitNumber: '101',
      contactName: 'John Doe',
      contactPhone: '+1234567890',
    },
  ];

  const mockPricingConfig = {
    Apartment: {
      sizes: [
        {
          label: '1 Bed',
          prices: {
            Photography: { price: 500, slots: 1 },
          },
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: mockUserId });
    getPricingConfig.mockResolvedValue(mockPricingConfig);
    getDiscounts.mockResolvedValue({ success: true, data: [] });
    User.findByPk.mockResolvedValue({ id: mockUserId, email: 'test@example.com' });
    
    // Mock Booking.findAll to return empty for availability check
    Booking.findAll.mockResolvedValue([]); 
    Booking.count.mockResolvedValue(0);
  });

  describe('createBookings', () => {
    it('should create bookings successfully with startTime and duration', async () => {
      Booking.create.mockResolvedValue({
        id: 1,
        bookingCode: null,
        update: jest.fn().mockImplementation(function updateBooking(data) {
          this.bookingCode = data.bookingCode;
          return Promise.resolve(this);
        }),
      });

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, bookingCode: 'MWB-1001' }]);
      expect(Booking.destroy).toHaveBeenCalledWith({
        where: { userId: mockUserId, status: 'DRAFT' },
      });
      expect(Booking.create).toHaveBeenCalledTimes(1);
      expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUserId,
        status: 'DRAFT',
        startTime: '10:00',
        duration: 2,
        total: 500,
      }));
    });

    it('should fail if requested slots are occupied', async () => {
      // Mock existing booking at 11:00 (overlaps with 10:00-12:00)
      const mockExistingBooking = {
        userId: 'other-user',
        status: 'CONFIRMED',
        date: mockFutureDate,
        startTime: '09:00',
        duration: 1,
      };
      
      Booking.findAll.mockResolvedValue([mockExistingBooking]);

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/no longer available/i);
    });

    it('should return error if not authenticated', async () => {
      auth.mockResolvedValue(null);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Unauthorized/);
      
      consoleSpy.mockRestore();
    });
  });

  describe('createTransactionAndPaymentIntent', () => {
    it('should create transaction and stripe session', async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        { id: 1, userId: mockUserId, total: 500, date: mockFutureDate, slot: 1, duration: 1 },
      ];
      
      Booking.findAll.mockImplementation(({ where }) => {
        // Need to simulate finding by IDs
        if (where.id) return Promise.resolve(mockBookings);
        // Need to simulate availability check (exclude current bookings)
        return Promise.resolve([]);
      });

      Transaction.create.mockResolvedValue({ 
        id: 'txn-1', 
        update: jest.fn() 
      });

      Booking.update.mockResolvedValue([1]);

      // Access the exposed mock function
      Stripe.mockCreateSession.mockResolvedValue({
        id: 'sess-1',
        url: 'http://stripe.com/checkout',
      });

      const result = await createTransactionAndPaymentIntent(mockBookingIds, '');

      expect(result.success).toBe(true);
      expect(result.data.url).toBe('http://stripe.com/checkout');
      expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUserId,
        amount: 250,
        bulkDeduction: 250,
        status: 'pending',
      }));
      expect(Booking.update).toHaveBeenCalled();
    });

    it('should auto-apply the first-shoot launch credit on eligible bookings', async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        { id: 1, userId: mockUserId, total: 800, date: mockFutureDate, slot: 1, duration: 1 },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      Booking.count.mockResolvedValue(0);
      require('@/lib/db/models/coupon').findOne.mockResolvedValue(null);

      Transaction.create.mockResolvedValue({
        id: 'txn-2',
        update: jest.fn(),
      });

      Booking.update.mockResolvedValue([1]);
      Stripe.mockCreateSession.mockResolvedValue({
        id: 'sess-2',
        url: 'http://stripe.com/checkout-2',
      });

      const result = await createTransactionAndPaymentIntent(mockBookingIds, '');

      expect(result.success).toBe(true);
      expect(Booking.count).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: [
          {
            model: Transaction,
            as: 'transaction',
            required: true,
            where: { status: 'success' },
          },
        ],
      });
      expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 550,
        bulkDeduction: 250,
        couponDeduction: 0,
      }));
    });

    it('should stack an eligible loyalty coupon on top of the auto launch credit', async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        { id: 1, userId: mockUserId, total: 1050, date: mockFutureDate, slot: 1, duration: 1 },
      ];
      const Coupon = require('@/lib/db/models/coupon').default || require('@/lib/db/models/coupon');

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      Booking.count.mockResolvedValue(0);
      Coupon.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 9,
          code: 'LOYAL10',
          isActive: true,
          minimumAmount: 300,
          percentDiscount: 10,
          maxDiscount: 120,
        });

      Transaction.create.mockResolvedValue({
        id: 'txn-3',
        update: jest.fn(),
      });
      Booking.update.mockResolvedValue([1]);
      Stripe.mockCreateSession.mockResolvedValue({
        id: 'sess-3',
        url: 'http://stripe.com/checkout-3',
      });

      const result = await createTransactionAndPaymentIntent(mockBookingIds, 'LOYAL10');

      expect(result.success).toBe(true);
      expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 495,
        bulkDeduction: 500,
        couponDeduction: 55,
      }));
    });
  });

  describe('cancelBookingBySessionId', () => {
    it('restores draft selections when checkout is cancelled', async () => {
      const transaction = {
        id: 'txn-3',
        status: 'pending',
        update: jest.fn(),
      };
      Transaction.findOne.mockResolvedValue(transaction);
      Booking.update.mockResolvedValue([1]);

      const result = await cancelBookingBySessionId('sess-3');

      expect(result.success).toBe(true);
      expect(transaction.update).toHaveBeenCalledWith({ status: 'failed' });
      expect(Booking.update).toHaveBeenCalledWith(
        { cancelledAt: null, status: 'DRAFT' },
        {
          where: {
            transactionId: 'txn-3',
            status: { [Op.in]: ['DRAFT', 'CANCELLED'] },
          },
        },
      );
      expect(result.data).toEqual({
        restoredDrafts: true,
        alreadyPaid: false,
      });
    });

    it('does not downgrade already paid bookings', async () => {
      const transaction = {
        id: 'txn-4',
        status: 'success',
        update: jest.fn(),
      };
      Transaction.findOne.mockResolvedValue(transaction);

      const result = await cancelBookingBySessionId('sess-4');

      expect(result.success).toBe(true);
      expect(transaction.update).not.toHaveBeenCalled();
      expect(Booking.update).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        restoredDrafts: false,
        alreadyPaid: true,
      });
    });
  });
});
