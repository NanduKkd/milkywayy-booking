import BookingHandoffPageClient from "./BookingHandoffPageClient";

export const dynamic = "force-dynamic";

export default async function BookingHandoffPage({ params }) {
  const resolvedParams = await params;

  return <BookingHandoffPageClient token={resolvedParams.token} />;
}
