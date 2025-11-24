import { Suspense } from 'react';
// import { auth } from '@/lib/helpers/auth';
import BookNew from './BookNew';
// import { getBookings } from '@/lib/actions/bookings'
// import { getPricings } from '@/lib/actions/dynamicConfig'

export default async function Booking() {
  // const session = await auth();
  // const bookingsPromise = session?.profile?.id && getBookings(session.profile.id);
  // const pricingsPromise = getPricings();
  
  // Mock data for frontend development
  const mockPricings = [
    {
      propertyTypes: [
        { propertyType: 'Apartment' },
        { propertyType: 'Villa' },
        { propertyType: 'Townhouse' },
        { propertyType: 'Penthouse' },
      ]
    }
  ];
  
  return (
    <Suspense fallback={<div className="">Loading...</div>}>
      <BookNew bookingsPromise={Promise.resolve([])} pricingsPromise={Promise.resolve(mockPricings)} />
    </Suspense>
  )
}
