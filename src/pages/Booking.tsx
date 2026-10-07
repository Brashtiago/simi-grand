import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Users, Check, ShieldCheck, Loader2, X, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import PageHeader from '@/components/PageHeader';
import SmartImage from '@/components/SmartImage';
import type { Room } from '@/lib/rooms';
import { useHotelData } from '@/lib/hotel-data';
import { useRooms } from '@/lib/rooms';
import { supabase } from '@/lib/supabase';
import { checkRoomAvailability } from '@/lib/availability';
import { fetchPriceOverrides, calculateStayPrice, type PriceOverride } from '@/lib/pricing';

type Step = 'details' | 'payment';
type PaymentChoice = 'Pay Now' | 'Pay at Checkout' | null;

export default function Booking() {
  const { settings } = useHotelData();
  const { rooms: ROOMS } = useRooms();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomSlug = searchParams.get('room') || '';
  const checkInParam = searchParams.get('check_in') || '';
  const checkOutParam = searchParams.get('check_out') || '';

  const [step, setStep] = useState<Step>('details');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({
    checkIn: checkInParam,
    checkOut: checkOutParam,
    guests: '2',
    numberOfRooms: '1',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestCountry: '',
    specialRequests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Payment step state
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Price overrides
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);

  useEffect(() => {
    if (roomSlug) {
      const room = ROOMS.find((r) => r.slug === roomSlug);
      if (room) setSelectedRoom(room);
    }
  }, [roomSlug]);

  useEffect(() => {
    if (selectedRoom) {
      fetchPriceOverrides(selectedRoom.slug).then(setPriceOverrides);
    } else {
      setPriceOverrides([]);
    }
  }, [selectedRoom]);

  const calculateNights = () => {
    if (!form.checkIn || !form.checkOut) return 0;
    const start = new Date(form.checkIn);
    const end = new Date(form.checkOut);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const nights = calculateNights();
  const today = new Date().toISOString().split('T')[0];

  const { total: totalPrice, nightlyBreakdown, subtotal, discountAmount, discountApplied } =
    selectedRoom && nights > 0
      ? calculateStayPrice(form.checkIn, form.checkOut, selectedRoom.price, priceOverrides, parseInt(form.numberOfRooms))
      : { total: 0, nightlyBreakdown: [], subtotal: 0, discountAmount: 0, discountApplied: false };

  const hasOverrideNights = nightlyBreakdown.some((n) => n.overridden);
  const uniformNightPrice = nightlyBreakdown.length > 0 ? nightlyBreakdown[0].price : 0;
  const allNightsSamePrice = !hasOverrideNights || nightlyBreakdown.every((n) => n.price === uniformNightPrice);

  useEffect(() => {
    if (!showQRModal) return;
    const upiUri = `upi://pay?pa=${encodeURIComponent(settings?.upi_id || '')}&pn=${encodeURIComponent(settings?.upi_payee_name || '')}&am=${totalPrice}&cu=INR&tn=${encodeURIComponent(`Booking ${selectedRoom?.name || ''}`)}`;
    QRCode.toDataURL(upiUri, { width: 256, margin: 2, color: { dark: '#1A1C1E', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [showQRModal, totalPrice, selectedRoom]);

  const checkAvailability = useCallback(async () => {
    if (!selectedRoom || !form.checkIn || !form.checkOut || nights <= 0) {
      setIsAvailable(null);
      setAvailabilityError('');
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityError('');

    const { available } = await checkRoomAvailability(
      selectedRoom.slug,
      form.checkIn,
      form.checkOut
    );

    setIsAvailable(available);
    if (!available) {
      setAvailabilityError('This room is not available for the selected dates.');
    }
    setCheckingAvailability(false);
  }, [selectedRoom, form.checkIn, form.checkOut, nights]);

  useEffect(() => {
    if (selectedRoom && form.checkIn && form.checkOut && nights > 0) {
      setIsAvailable(null);
      setAvailabilityError('');
      const timer = setTimeout(() => {
        checkAvailability();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selectedRoom, form.checkIn, form.checkOut, nights, checkAvailability]);

  const formValid =
    selectedRoom &&
    nights > 0 &&
    form.guestName.trim() &&
    form.guestEmail.trim() &&
    form.guestPhone.trim();

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || nights <= 0) {
      setError('Please select a room and valid dates.');
      return;
    }
    if (!form.guestName.trim() || !form.guestEmail.trim() || !form.guestPhone.trim()) {
      setError('Please fill in your name, email, and phone.');
      return;
    }
    if (isAvailable === false) {
      setError('This room is not available for the selected dates.');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handleBackToDetails = () => {
    setStep('details');
    setPaymentChoice(null);
    setShowQRModal(false);
    setError('');
  };

  const createBooking = async (paymentMethod: string, paymentStatus: string) => {
    const reference = `ASG${Date.now().toString().slice(-6)}`;

    const { data, error: insertError } = await supabase
      .from('bookings')
      .insert({
        booking_reference: reference,
        room_id: selectedRoom!.slug,
        room_name: selectedRoom!.name,
        check_in: form.checkIn,
        check_out: form.checkOut,
        nights,
        number_of_rooms: parseInt(form.numberOfRooms),
        guests: parseInt(form.guests),
        guest_name: form.guestName,
        guest_email: form.guestEmail,
        guest_phone: form.guestPhone,
        guest_country: form.guestCountry,
        special_requests: form.specialRequests,
        total_price: totalPrice,
        discount_amount: discountApplied ? discountAmount : 0,
        discount_label: discountApplied ? 'October 2026 · 20% off' : null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        booking_status: 'Pending',
      })
      .select()
      .maybeSingle();

    if (insertError) throw insertError;
    if (!data) throw new Error('Booking could not be created.');

    return reference;
  };

  const handlePayAtCheckout = async () => {
    setSubmitting(true);
    setError('');

    const { available } = await checkRoomAvailability(
      selectedRoom!.slug,
      form.checkIn,
      form.checkOut
    );

    if (!available) {
      setError('This room is not available for the selected dates.');
      setSubmitting(false);
      return;
    }

    try {
      const reference = await createBooking('Pay at Checkout', 'Pay at Checkout');
      navigate(`/booking-confirmation?ref=${reference}`);
    } catch {
      setError('Please try again or contact us directly.');
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    setSubmitting(true);
    setError('');

    const { available } = await checkRoomAvailability(
      selectedRoom!.slug,
      form.checkIn,
      form.checkOut
    );

    if (!available) {
      setError('This room is not available for the selected dates.');
      setSubmitting(false);
      return;
    }

    try {
      const reference = await createBooking('Pay Now', 'Pending Verification');
      navigate(`/booking-confirmation?ref=${reference}`);
    } catch {
      setError('Please try again or contact us directly.');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Booking"
        title="Begin your mountain story"
        description="Secure your room instantly with online payment."
        image="/media/gallery-photos/3.jpg"
      />

      <section className="bg-[#f5f3ee] py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Link to="/rooms" className="group mb-8 inline-flex items-center gap-2 text-sm text-[#8B7355] transition-colors hover:text-[#1A1C1E]">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Back to Rooms
          </Link>

          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-3 sm:mb-10 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${step === 'details' ? 'bg-[#1A1C1E] text-white' : 'bg-[#8B7355] text-white'}`}>
                {step === 'payment' ? <Check size={14} /> : '1'}
              </span>
              <span className={`hidden sm:inline text-sm font-medium ${step === 'details' ? 'text-[#1A1C1E]' : 'text-[#8B7355]'}`}>Your Details</span>
            </div>
            <div className={`h-px flex-1 ${step === 'payment' ? 'bg-[#8B7355]' : 'bg-[#1A1C1E]/20'}`} />
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${step === 'payment' ? 'bg-[#1A1C1E] text-white' : 'bg-[#1A1C1E]/10 text-[#1A1C1E]/40'}`}>
                2
              </span>
              <span className={`hidden sm:inline text-sm font-medium ${step === 'payment' ? 'text-[#1A1C1E]' : 'text-[#1A1C1E]/40'}`}>Payment</span>
            </div>
          </div>

          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} className="grid gap-8 lg:grid-cols-3 lg:gap-16">
              {/* Left: Form */}
              <div className="space-y-8 lg:col-span-2 lg:space-y-10">
                {/* Room Selection */}
                <div>
                  <h2 className="font-heading text-2xl font-medium text-[#1A1C1E]">Select Room</h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {ROOMS.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoom(room)}
                        className={`group overflow-hidden rounded-sm border-2 text-left transition-all duration-300 ${
                          selectedRoom?.id === room.id
                            ? 'border-[#8B7355] shadow-lg'
                            : 'border-transparent bg-white shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <SmartImage src={room.images[0]} alt={room.name} className="h-full w-full object-cover" />
                          {selectedRoom?.id === room.id && (
                            <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#8B7355]">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-heading text-lg font-medium text-[#1A1C1E]">{room.name}</h3>
                          <p className="mt-1 text-xs text-[#4a4a4a]">₹{room.price.toLocaleString('en-IN')} / night</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates & Guests */}
                <div>
                  <h2 className="font-heading text-2xl font-medium text-[#1A1C1E]">Stay Details</h2>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8B7355]">
                        <Calendar size={14} />
                        Check-in
                      </label>
                      <input
                        type="date"
                        required
                        min={today}
                        value={form.checkIn}
                        onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8B7355]">
                        <Calendar size={14} />
                        Check-out
                      </label>
                      <input
                        type="date"
                        required
                        min={form.checkIn || today}
                        value={form.checkOut}
                        onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8B7355]">
                        <Users size={14} />
                        Guests
                      </label>
                      <select
                        value={form.guests}
                        onChange={(e) => setForm({ ...form, guests: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8B7355]">
                        <Calendar size={14} />
                        Rooms
                      </label>
                      <select
                        value={form.numberOfRooms}
                        onChange={(e) => setForm({ ...form, numberOfRooms: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Guest Details */}
                <div>
                  <h2 className="font-heading text-2xl font-medium text-[#1A1C1E]">Guest Information</h2>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.guestName}
                        onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Email</label>
                      <input
                        type="email"
                        required
                        value={form.guestEmail}
                        onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Phone</label>
                      <input
                        type="tel"
                        required
                        value={form.guestPhone}
                        onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="+91 ..."
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Country</label>
                      <input
                        type="text"
                        value={form.guestCountry}
                        onChange={(e) => setForm({ ...form, guestCountry: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="India"
                      />
                    </div>
                  </div>
                  <div className="mt-5">
                    <label className="text-xs uppercase tracking-wide text-[#8B7355]">Special Requests</label>
                    <textarea
                      rows={3}
                      value={form.specialRequests}
                      onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                      className="mt-1.5 w-full resize-none border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                      placeholder="Airport pickup, dietary preferences, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Right: Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 rounded-sm bg-white p-6 shadow-lg">
                  <h3 className="font-heading text-xl font-medium text-[#1A1C1E]">Booking Summary</h3>

                  {selectedRoom ? (
                    <div className="mt-4 overflow-hidden rounded-sm">
                      <SmartImage src={selectedRoom.images[0]} alt={selectedRoom.name} className="aspect-[4/3] w-full object-cover" />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-[#4a4a4a]">Please select a room to continue.</p>
                  )}

                  {selectedRoom && (
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Room</span>
                        <span className="font-medium text-[#1A1C1E]">{selectedRoom.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Check-in</span>
                        <span className="font-medium text-[#1A1C1E]">{form.checkIn || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Check-out</span>
                        <span className="font-medium text-[#1A1C1E]">{form.checkOut || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Guests</span>
                        <span className="font-medium text-[#1A1C1E]">{form.guests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Rooms</span>
                        <span className="font-medium text-[#1A1C1E]">{form.numberOfRooms}</span>
                      </div>
                      {nights > 0 && (
                        <>
                          {hasOverrideNights && !allNightsSamePrice ? (
                            <div className="border-t border-[#1A1C1E]/10 pt-3">
                              <p className="mb-2 text-xs text-[#8B7355]">Seasonal pricing applied</p>
                              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                                {nightlyBreakdown.map((n) => (
                                  <div key={n.date} className="flex justify-between text-xs">
                                    <span className={n.overridden ? 'text-[#8B7355]' : 'text-[#4a4a4a]'}>
                                      {new Date(n.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                      {n.overridden && ' · custom'}
                                    </span>
                                    <span className={n.overridden ? 'font-medium text-[#8B7355]' : 'text-[#4a4a4a]'}>
                                      ₹{n.price.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {parseInt(form.numberOfRooms) > 1 && (
                                <div className="mt-2 flex justify-between text-xs">
                                  <span className="text-[#4a4a4a]">× {form.numberOfRooms} rooms</span>
                                  <span className="font-medium text-[#1A1C1E]">₹{totalPrice.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-between border-t border-[#1A1C1E]/10 pt-3">
                              <span className="text-[#4a4a4a]">{nights} nights × ₹{uniformNightPrice.toLocaleString('en-IN')}{hasOverrideNights && ' (custom rate)'}</span>
                              <span className="font-medium text-[#1A1C1E]">₹{(uniformNightPrice * nights).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {parseInt(form.numberOfRooms) > 1 && allNightsSamePrice && (
                            <div className="flex justify-between">
                              <span className="text-[#4a4a4a]">× {form.numberOfRooms} rooms</span>
                              <span className="font-medium text-[#1A1C1E]">₹{totalPrice.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {discountApplied && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-[#4a4a4a]">Subtotal</span>
                                <span className="text-[#4a4a4a] line-through">₹{subtotal.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-green-700">October 2026 · 20% off</span>
                                <span className="font-medium text-green-700">-₹{discountAmount.toLocaleString('en-IN')}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between border-t border-[#1A1C1E]/10 pt-3">
                            <span className="font-medium text-[#1A1C1E]">Total</span>
                            <span className="font-heading text-2xl font-medium text-[#8B7355]">₹{totalPrice.toLocaleString('en-IN')}</span>
                          </div>
                          {discountApplied && (
                            <div className="rounded-sm bg-green-50 p-3 text-center text-xs font-medium text-green-700">
                              You saved ₹{discountAmount.toLocaleString('en-IN')} with our October 2026 campaign!
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex items-start gap-2 rounded-sm bg-[#8B7355]/5 p-3 text-xs text-[#4a4a4a]">
                        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#8B7355]" />
                        Free cancellation up to 48 hours before check-in
                      </div>
                    </div>
                  )}

                  {availabilityError && isAvailable === false && !error && (
                    <div className="mt-4 rounded-sm bg-red-50 p-3 text-sm text-red-600">
                      {availabilityError}
                    </div>
                  )}
                  {isAvailable === true && nights > 0 && !error && (
                    <div className="mt-4 flex items-center gap-2 rounded-sm bg-green-50 p-3 text-sm text-green-700">
                      <Check size={14} />
                      Room is available for these dates
                    </div>
                  )}
                  {checkingAvailability && nights > 0 && (
                    <div className="mt-4 flex items-center gap-2 p-3 text-sm text-[#8B7355]">
                      <Loader2 size={14} className="animate-spin" />
                      Checking availability...
                    </div>
                  )}

                  {error && (
                    <p className="mt-4 rounded-sm bg-red-50 p-3 text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={!formValid || isAvailable === false || checkingAvailability}
                    className="group mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-[#1A1C1E] py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#8B7355] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Proceed to Payment
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'payment' && (
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-16">
              {/* Left: Payment options */}
              <div className="space-y-6 lg:col-span-2 lg:space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={handleBackToDetails}
                    className="group mb-6 inline-flex items-center gap-2 text-sm text-[#8B7355] transition-colors hover:text-[#1A1C1E]"
                  >
                    <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                    Back to Details
                  </button>
                  <h2 className="font-heading text-2xl font-medium text-[#1A1C1E]">Choose Payment Method</h2>
                  <p className="mt-2 text-sm text-[#4a4a4a]">
                    Your room is available. Select how you'd like to pay for your stay.
                  </p>
                </div>

                {/* Pay at Checkout */}
                <div
                  onClick={() => setPaymentChoice('Pay at Checkout')}
                  className={`cursor-pointer rounded-sm border-2 p-5 transition-all duration-300 sm:p-6 ${
                    paymentChoice === 'Pay at Checkout'
                      ? 'border-[#8B7355] bg-white shadow-md'
                      : 'border-transparent bg-white/60 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8B7355]/10">
                      <ShieldCheck size={24} className="text-[#8B7355]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading text-lg font-medium text-[#1A1C1E]">Pay at Checkout</h3>
                        {paymentChoice === 'Pay at Checkout' && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B7355]">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[#4a4a4a]">
                        Reserve your room now and settle the full amount at the hotel during check-in or check-out. Your dates are blocked immediately upon confirmation.
                      </p>
                      <p className="mt-3 text-xs font-medium text-[#8B7355]">
                        Booking status: Pending · Payment status: Pay at Checkout
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pay Now */}
                <div
                  onClick={() => setPaymentChoice('Pay Now')}
                  className={`cursor-pointer rounded-sm border-2 p-5 transition-all duration-300 sm:p-6 ${
                    paymentChoice === 'Pay Now'
                      ? 'border-[#8B7355] bg-white shadow-md'
                      : 'border-transparent bg-white/60 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8B7355]/10">
                      <Smartphone size={24} className="text-[#8B7355]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading text-lg font-medium text-[#1A1C1E]">Pay Now with UPI</h3>
                        {paymentChoice === 'Pay Now' && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B7355]">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[#4a4a4a]">
                        Scan the UPI QR code with any UPI app (PhonePe, Google Pay, Paytm, etc.) to pay ₹{totalPrice.toLocaleString('en-IN')} now. After you've paid, click "I've Paid" to confirm your booking. Your booking will be created with "Pending Verification" status until we verify the payment.
                      </p>
                      <p className="mt-3 text-xs font-medium text-[#8B7355]">
                        Booking status: Pending · Payment status: Pending Verification
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-sm bg-red-50 p-4 text-sm text-red-600">
                    {error}
                  </div>
                )}
              </div>

              {/* Right: Summary + Action */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 rounded-sm bg-white p-6 shadow-lg">
                  <h3 className="font-heading text-xl font-medium text-[#1A1C1E]">Booking Summary</h3>

                  {selectedRoom && (
                    <div className="mt-4 overflow-hidden rounded-sm">
                      <SmartImage src={selectedRoom.images[0]} alt={selectedRoom.name} className="aspect-[4/3] w-full object-cover" />
                    </div>
                  )}

                  {selectedRoom && (
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Room</span>
                        <span className="font-medium text-[#1A1C1E]">{selectedRoom.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Check-in</span>
                        <span className="font-medium text-[#1A1C1E]">{form.checkIn || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Check-out</span>
                        <span className="font-medium text-[#1A1C1E]">{form.checkOut || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Guests</span>
                        <span className="font-medium text-[#1A1C1E]">{form.guests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#4a4a4a]">Rooms</span>
                        <span className="font-medium text-[#1A1C1E]">{form.numberOfRooms}</span>
                      </div>
                      {nights > 0 && (
                        <>
                          {hasOverrideNights && !allNightsSamePrice ? (
                            <div className="border-t border-[#1A1C1E]/10 pt-3">
                              <p className="mb-2 text-xs text-[#8B7355]">Seasonal pricing applied</p>
                              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                                {nightlyBreakdown.map((n) => (
                                  <div key={n.date} className="flex justify-between text-xs">
                                    <span className={n.overridden ? 'text-[#8B7355]' : 'text-[#4a4a4a]'}>
                                      {new Date(n.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                      {n.overridden && ' · custom'}
                                    </span>
                                    <span className={n.overridden ? 'font-medium text-[#8B7355]' : 'text-[#4a4a4a]'}>
                                      ₹{n.price.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {parseInt(form.numberOfRooms) > 1 && (
                                <div className="mt-2 flex justify-between text-xs">
                                  <span className="text-[#4a4a4a]">× {form.numberOfRooms} rooms</span>
                                  <span className="font-medium text-[#1A1C1E]">₹{totalPrice.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-between border-t border-[#1A1C1E]/10 pt-3">
                              <span className="text-[#4a4a4a]">{nights} nights × ₹{uniformNightPrice.toLocaleString('en-IN')}{hasOverrideNights && ' (custom rate)'}</span>
                              <span className="font-medium text-[#1A1C1E]">₹{(uniformNightPrice * nights).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {parseInt(form.numberOfRooms) > 1 && allNightsSamePrice && (
                            <div className="flex justify-between">
                              <span className="text-[#4a4a4a]">× {form.numberOfRooms} rooms</span>
                              <span className="font-medium text-[#1A1C1E]">₹{totalPrice.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {discountApplied && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-[#4a4a4a]">Subtotal</span>
                                <span className="text-[#4a4a4a] line-through">₹{subtotal.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-green-700">October 2026 · 20% off</span>
                                <span className="font-medium text-green-700">-₹{discountAmount.toLocaleString('en-IN')}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between border-t border-[#1A1C1E]/10 pt-3">
                            <span className="font-medium text-[#1A1C1E]">Total</span>
                            <span className="font-heading text-2xl font-medium text-[#8B7355]">₹{totalPrice.toLocaleString('en-IN')}</span>
                          </div>
                          {discountApplied && (
                            <div className="rounded-sm bg-green-50 p-3 text-center text-xs font-medium text-green-700">
                              You saved ₹{discountAmount.toLocaleString('en-IN')} with our October 2026 campaign!
                            </div>
                          )}
                        </>
                      )}
                      {paymentChoice && (
                        <div className="rounded-sm bg-[#8B7355]/5 p-3 text-xs text-[#4a4a4a]">
                          <p className="font-medium text-[#1A1C1E]">{paymentChoice}</p>
                          <p className="mt-1">
                            {paymentChoice === 'Pay at Checkout'
                              ? 'Pay at the hotel. Dates blocked immediately.'
                              : 'Pay via UPI QR. Booking created after payment.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pay at Checkout action */}
                  {paymentChoice === 'Pay at Checkout' && (
                    <button
                      type="button"
                      onClick={handlePayAtCheckout}
                      disabled={submitting}
                      className="group mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-[#1A1C1E] py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#8B7355] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? 'Confirming...' : 'Confirm Booking'}
                      {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                    </button>
                  )}

                  {/* Pay Now action */}
                  {paymentChoice === 'Pay Now' && (
                    <button
                      type="button"
                      onClick={() => setShowQRModal(true)}
                      disabled={submitting}
                      className="group mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-[#5f259f] py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#4a1d7d] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Smartphone size={16} />
                      Show Payment QR
                    </button>
                  )}

                  {!paymentChoice && (
                    <div className="mt-6 rounded-sm border border-dashed border-[#1A1C1E]/20 p-4 text-center text-sm text-[#4a4a4a]">
                      Select a payment method to continue
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => !submitting && setShowQRModal(false)}>
          <div className="relative my-8 w-full max-w-md rounded-sm bg-white p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => !submitting && setShowQRModal(false)}
              disabled={submitting}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-[#4a4a4a] transition-colors hover:bg-[#f5f3ee] disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5f259f]/10">
                <Smartphone size={24} className="text-[#5f259f]" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-medium text-[#1A1C1E]">Pay with UPI</h3>
              <p className="mt-1 text-sm text-[#4a4a4a]">
                Scan the QR code below with any UPI app to pay
              </p>

              {/* Amount */}
              <div className="mt-6 rounded-sm bg-[#f5f3ee] py-4">
                <p className="text-xs uppercase tracking-wide text-[#8B7355]">Amount Due</p>
                <p className="mt-1 font-heading text-3xl font-medium text-[#1A1C1E]">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </p>
              </div>

              {/* QR Code */}
              <div className="mt-4 flex justify-center sm:mt-6">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI Payment QR Code"
                    className="h-56 w-56 rounded-sm border border-[#1A1C1E]/10 object-contain sm:h-64 sm:w-64"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-sm border border-[#1A1C1E]/10 sm:h-64 sm:w-64">
                    <Loader2 size={32} className="animate-spin text-[#8B7355]" />
                  </div>
                )}
              </div>

              <p className="mt-4 text-xs text-[#4a4a4a]">
                Open any UPI app (PhonePe, Google Pay, Paytm, etc.), scan the code, and complete the payment.
              </p>

              {/* I've Paid button */}
              <button
                type="button"
                onClick={handlePayNow}
                disabled={submitting}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-[#5f259f] py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#4a1d7d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    I've Paid
                  </>
                )}
              </button>

              <p className="mt-4 text-xs text-[#4a4a4a]">
                After clicking "I've Paid", your booking will be created with "Pending Verification" status. We'll verify your payment and confirm shortly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
