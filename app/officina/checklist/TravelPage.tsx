import TravelChecklistClient from "./TravelChecklistClient";
export default function TravelPage({ bookingId }: { bookingId: string }) {
  return <TravelChecklistClient bookingId={bookingId} />;
}
