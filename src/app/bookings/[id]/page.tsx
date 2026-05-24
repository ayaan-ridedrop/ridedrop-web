import { redirect } from 'next/navigation';

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // TODO: Fix booking detail page - for MVP, redirect to bookings list
  // The page has complex data fetching that's causing server errors
  redirect('/bookings');
}
