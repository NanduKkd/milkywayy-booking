'use server';

import { db } from '@/lib/db/db';
import Booking from '@/lib/db/models/booking';
import { auth } from '@/lib/helpers/auth';

export const getBookings = async (userId) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        { model: db.models.User, as: 'user' },
        { model: db.models.Transaction, as: 'transaction' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return bookings;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw new Error('Failed to fetch bookings');
  }
};

export const createBooking = async (data) => {
  try {
    const session = await auth();
    if (!session?.profile?.id) {
      throw new Error('Unauthorized');
    }

    const booking = await Booking.create({
      userId: session.profile.id,
      shootDetails: data.shootDetails,
      propertyDetails: data.propertyDetails,
      contactDetails: data.contactDetails,
      date: data.date,
      slot: data.slot,
      total: data.total,
    });

    return booking;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw new Error('Failed to create booking');
  }
};