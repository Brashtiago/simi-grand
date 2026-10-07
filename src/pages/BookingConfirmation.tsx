import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Users, Home, Phone, Mail, ArrowRight, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useHotelData } from '@/lib/hotel-data';

interface BookingData {
  booking_reference: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  number_of_rooms: number;
  guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_country: string;
  total_price: number;
  discount_amount: number | null;
  discount_label: string | null;
  payment_method: string;
  booking_status: string;
  special_requests: string | null;
}

export default function BookingConfirmation() {
  const { settings } = useHotelData();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('ref') || '';
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!reference) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_reference', reference)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setBooking(data as BookingData);
      }
      setLoading(false);
    };
    fetchBooking();
  }, [reference]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee]">
        <div className="text-sm text-[#8B7355]">Loading your booking...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee] px-4">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-3xl font-medium text-[#1A1C1E]">Booking Not Found</h1>
          <p className="mt-4 text-sm text-[#4a4a4a]">We couldn't find a booking with that reference. Please check your reference number or contact us.</p>
          <Link
            to="/booking"
            className="mt-8 inline-flex items-center gap-2 rounded-sm bg-[#1A1C1E] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#8B7355]"
          >
            New Booking
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const bookingData = booking!;

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      {/* Success Banner */}
      <section className="bg-[#1A1C1E] py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-200/10">
            <CheckCircle size={40} className="text-amber-200" />
          </div>
          <h1 className="mt-6 font-heading text-3xl font-light text-white sm:text-4xl sm:text-5xl">
            Your mountain retreat is reserved.
          </h1>
          <p className="mt-4 text-base text-white/70">
            Confirm the details below to secure your stay. We look forward to welcoming you to {settings?.short_name}.
          </p>
          <div className="mt-6 inline-block rounded-sm bg-amber-200/10 px-6 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Booking Reference</p>
            <p className="mt-1 font-heading text-2xl font-medium text-amber-200">{bookingData.booking_reference}</p>
          </div>
        </div>
      </section>

      {/* Booking Details */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <div className="overflow-hidden rounded-sm bg-white shadow-lg">
            <div className="border-b border-[#1A1C1E]/10 bg-[#1A1C1E] px-6 py-5 sm:px-8 sm:py-6">
              <h2 className="font-heading text-2xl font-medium text-white">Booking Details</h2>
              <p className="mt-1 text-sm text-white/60">Reference: {bookingData.booking_reference}</p>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2 sm:gap-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Home size={18} className="text-[#8B7355]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8B7355]">Room</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{bookingData.room_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-[#8B7355]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8B7355]">Check-in</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{bookingData.check_in}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-[#8B7355]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8B7355]">Check-out</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{bookingData.check_out}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users size={18} className="text-[#8B7355]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8B7355]">Guests</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{bookingData.guests} guests · {bookingData.number_of_rooms} room(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-[#8B7355]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8B7355]">Phone</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{bookingData.guest_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-[#8B7355]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8B7355]">Email</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{bookingData.guest_email}</p>
                </div>
              </div>
            </div>

            {bookingData.special_requests && (
              <div className="border-t border-[#1A1C1E]/10 px-6 py-5 sm:px-8 sm:py-6">
                <p className="text-xs uppercase tracking-wide text-[#8B7355]">Special Requests</p>
                <p className="mt-2 text-sm text-[#4a4a4a]">{bookingData.special_requests}</p>
              </div>
            )}

            <div className="border-t border-[#1A1C1E]/10 bg-[#f5f3ee] px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-3">
                {Number(bookingData.discount_amount) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a4a4a] line-through">₹{(Number(bookingData.total_price) + Number(bookingData.discount_amount)).toLocaleString('en-IN')}</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-green-700">{bookingData.discount_label}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">{bookingData.nights} nights · {bookingData.number_of_rooms} room(s)</p>
                    <p className="mt-1 text-xs text-[#4a4a4a]">Payment: {bookingData.payment_method} · Status: {bookingData.booking_status}</p>
                  </div>
                  <p className="font-heading text-3xl font-medium text-[#8B7355]">₹{Number(bookingData.total_price).toLocaleString('en-IN')}</p>
                </div>
                {Number(bookingData.discount_amount) > 0 && (
                  <div className="rounded-sm bg-green-50 p-3 text-center text-xs font-medium text-green-700">
                    You saved ₹{Number(bookingData.discount_amount).toLocaleString('en-IN')} with our October 2026 campaign!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mt-6 rounded-sm bg-white p-6 shadow-sm sm:mt-8 sm:p-8">
            <h3 className="font-heading text-xl font-medium text-[#1A1C1E]">What happens next?</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#4a4a4a]">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B7355]" />
                A confirmation has been sent to your email. Please keep your booking reference for check-in.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B7355]" />
                Valid photo identification is required at check-in.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B7355]" />
                Free cancellation is available up to 48 hours before the check-in date.
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#8B7355]" />
                {settings?.address}
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#1A1C1E] px-8 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#8B7355]"
            >
              Return Home
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#1A1C1E]/20 px-8 py-3.5 text-sm font-medium text-[#1A1C1E] transition-all duration-300 hover:bg-[#1A1C1E] hover:text-white"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
