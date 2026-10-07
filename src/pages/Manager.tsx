import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, localizeMediaUrl } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import StaffHeader from '@/components/StaffHeader';
import BookingCalendar from '@/components/BookingCalendar';
import { Search, CheckCircle, Clock, XCircle, CreditCard, Banknote, CalendarDays, List, Upload, Trash2, Loader2, ImageIcon, TrendingUp, Wallet, Banknote as BanknoteIcon, Tag, Plus, Pencil, CalendarPlus } from 'lucide-react';
import { useRooms } from '@/lib/rooms';
import { fetchRoomBookedDates, checkRoomAvailability } from '@/lib/availability';
import { fetchPriceOverrides, type PriceOverride } from '@/lib/pricing';
import { logActivity } from '@/lib/activity';
import RoomEditor from '@/components/RoomEditor';
import ManualBookingModal from '@/components/ManualBookingModal';
import GalleryManager from '@/components/GalleryManager';

interface Booking {
  id: string;
  booking_reference: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  number_of_rooms: number;
  guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_country: string | null;
  special_requests: string | null;
  total_price: number;
  payment_method: string;
  payment_status: string;
  booking_status: string;
  created_at: string;
}

interface RoomPhoto {
  id: string;
  room_slug: string;
  photo_url: string;
  storage_path: string;
  sort_order: number;
}

type StatusFilter = 'all' | 'Confirmed' | 'Pending' | 'Cancelled';
type ViewMode = 'list' | 'calendar' | 'photos' | 'pricing' | 'edit' | 'gallery';
type PaymentFilter = 'all' | 'Pending Verification' | 'Paid' | 'Pay at Checkout' | 'Offline';

interface RoomBookings {
  check_in: string;
  check_out: string;
  booking_status: string;
  guest_name: string;
}

const PAYMENT_STATUSES = ['Pending Verification', 'Paid', 'Pay at Checkout', 'Offline'] as const;

export default function Manager() {
  const { user } = useAuth();
  const { rooms: ROOMS, refresh: refreshRooms } = useRooms();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Calendar state
  const [selectedRoomSlug, setSelectedRoomSlug] = useState(ROOMS[0]?.slug || '');
  const [roomBookings, setRoomBookings] = useState<RoomBookings[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Photo state
  const [roomPhotos, setRoomPhotos] = useState<RoomPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing override state
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [newOverride, setNewOverride] = useState({ startDate: '', endDate: '', pricePerNight: '', label: '' });
  const [savingOverride, setSavingOverride] = useState(false);
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data as Booking[]);
    }
    setLoading(false);
  }, []);

  const fetchCalendarBookings = useCallback(async (slug: string) => {
    setCalendarLoading(true);
    const data = await fetchRoomBookedDates(slug);
    setRoomBookings(data);
    setCalendarLoading(false);
  }, []);

  const fetchRoomPhotos = useCallback(async (slug: string) => {
    setPhotosLoading(true);
    const { data, error } = await supabase
      .from('room_photos')
      .select('*')
      .eq('room_slug', slug)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setRoomPhotos(data as RoomPhoto[]);
    } else {
      setRoomPhotos([]);
    }
    setPhotosLoading(false);
  }, []);

  const fetchOverrides = useCallback(async (slug: string) => {
    setOverridesLoading(true);
    const data = await fetchPriceOverrides(slug);
    setPriceOverrides(data);
    setOverridesLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (!selectedRoomSlug && ROOMS.length > 0) {
      setSelectedRoomSlug(ROOMS[0].slug);
    }
  }, [ROOMS, selectedRoomSlug]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarBookings(selectedRoomSlug);
    }
  }, [viewMode, selectedRoomSlug, fetchCalendarBookings]);

  useEffect(() => {
    if (viewMode === 'photos') {
      fetchRoomPhotos(selectedRoomSlug);
    }
  }, [viewMode, selectedRoomSlug, fetchRoomPhotos]);

  useEffect(() => {
    if (viewMode === 'pricing') {
      fetchOverrides(selectedRoomSlug);
    }
  }, [viewMode, selectedRoomSlug, fetchOverrides]);

  const updatePaymentStatus = async (booking: Booking, value: string) => {
    setUpdatingId(booking.id);
    setActionError('');
    setActionSuccess('');

    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: value })
      .eq('id', booking.id);

    if (!error) {
      await logActivity(
        user,
        'payment_status_changed',
        'booking',
        `Marked booking ${booking.booking_reference} payment as "${value}"`,
        booking.booking_reference,
        { booking_reference: booking.booking_reference, old_status: booking.payment_status, new_status: value, guest_name: booking.guest_name },
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, payment_status: value } : b))
      );
      setActionSuccess(`Payment status updated to "${value}".`);
    } else {
      setActionError('Failed to update payment status.');
    }
    setUpdatingId(null);
  };

  const updateBookingStatus = async (booking: Booking, value: string) => {
    setUpdatingId(booking.id);
    setActionError('');
    setActionSuccess('');

    const { error } = await supabase
      .from('bookings')
      .update({ booking_status: value })
      .eq('id', booking.id);

    if (!error) {
      await logActivity(
        user,
        'booking_status_changed',
        'booking',
        `Changed booking ${booking.booking_reference} status to "${value}"`,
        booking.booking_reference,
        { booking_reference: booking.booking_reference, old_status: booking.booking_status, new_status: value, guest_name: booking.guest_name },
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, booking_status: value } : b))
      );
      setActionSuccess(`Booking status updated to "${value}".`);
    } else {
      setActionError('Failed to update booking status.');
    }
    setUpdatingId(null);
  };

  const handleDeleteBooking = async (booking: Booking) => {
    setUpdatingId(booking.id);
    setActionError('');
    setActionSuccess('');

    const { error } = await supabase.from('bookings').delete().eq('id', booking.id);

    if (!error) {
      await logActivity(
        user,
        'booking_deleted',
        'booking',
        `Deleted booking ${booking.booking_reference} for ${booking.guest_name}`,
        booking.booking_reference,
        { booking_reference: booking.booking_reference, guest_name: booking.guest_name, booking_status: booking.booking_status, room_name: booking.room_name },
      );
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      setActionSuccess('Booking deleted permanently.');
    } else {
      setActionError('Failed to delete booking.');
    }
    setUpdatingId(null);
    setDeleteTarget(null);
  };

  const confirmBooking = async (booking: Booking) => {
    setUpdatingId(booking.id);
    setActionError('');
    setActionSuccess('');

    const { available } = await checkRoomAvailability(
      booking.room_id,
      booking.check_in,
      booking.check_out,
      booking.id
    );

    if (!available) {
      setActionError(`Cannot confirm — ${booking.room_name} is already booked for ${booking.check_in} to ${booking.check_out}.`);
      setUpdatingId(null);
      return;
    }

    const { error } = await supabase
      .from('bookings')
      .update({ booking_status: 'Confirmed' })
      .eq('id', booking.id);

    if (!error) {
      await logActivity(
        user,
        'booking_status_changed',
        'booking',
        `Confirmed booking ${booking.booking_reference} for ${booking.guest_name}`,
        booking.booking_reference,
        { booking_reference: booking.booking_reference, old_status: booking.booking_status, new_status: 'Confirmed', guest_name: booking.guest_name },
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, booking_status: 'Confirmed' } : b))
      );
      setActionSuccess('Booking confirmed.');
    } else {
      setActionError('Failed to confirm booking.');
    }
    setUpdatingId(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setActionError('');
    setActionSuccess('');

    const fileExt = file.name.split('.').pop();
    const fileName = `${selectedRoomSlug}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('room-photos')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setActionError(`Upload failed: ${uploadError.message}`);
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const { data: urlData } = supabase.storage
      .from('room-photos')
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from('room_photos')
      .insert({
        room_slug: selectedRoomSlug,
        photo_url: urlData.publicUrl,
        storage_path: filePath,
        sort_order: roomPhotos.length,
      });

    if (dbError) {
      setActionError(`Failed to save photo record: ${dbError.message}`);
    } else {
      await logActivity(
        user,
        'photo_uploaded',
        'photo',
        `Uploaded photo for ${selectedRoom?.name || selectedRoomSlug}`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, photo_url: urlData.publicUrl },
      );
      setActionSuccess('Photo uploaded successfully.');
      fetchRoomPhotos(selectedRoomSlug);
      refreshRooms();
    }

    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateOverride = async () => {
    if (!newOverride.startDate || !newOverride.endDate || !newOverride.pricePerNight) {
      setActionError('Please fill in start date, end date, and price per night.');
      return;
    }
    if (new Date(newOverride.endDate) < new Date(newOverride.startDate)) {
      setActionError('End date cannot be before start date.');
      return;
    }

    setSavingOverride(true);
    setActionError('');
    setActionSuccess('');

    const { error } = await supabase
      .from('room_price_overrides')
      .insert({
        room_slug: selectedRoomSlug,
        start_date: newOverride.startDate,
        end_date: newOverride.endDate,
        price_per_night: parseFloat(newOverride.pricePerNight),
        label: newOverride.label || null,
      });

    if (error) {
      setActionError(`Failed to create price override: ${error.message}`);
    } else {
      await logActivity(
        user,
        'price_override_created',
        'price_override',
        `Added price override for ${selectedRoom?.name || selectedRoomSlug}: ₹${newOverride.pricePerNight}/night (${newOverride.startDate} to ${newOverride.endDate})`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, start_date: newOverride.startDate, end_date: newOverride.endDate, price_per_night: newOverride.pricePerNight, label: newOverride.label },
      );
      setActionSuccess('Price override created successfully.');
      setNewOverride({ startDate: '', endDate: '', pricePerNight: '', label: '' });
      fetchOverrides(selectedRoomSlug);
    }
    setSavingOverride(false);
  };

  const handleDeleteOverride = async (override: PriceOverride) => {
    setUpdatingId(override.id);
    setActionError('');
    setActionSuccess('');

    const { error } = await supabase
      .from('room_price_overrides')
      .delete()
      .eq('id', override.id);

    if (error) {
      setActionError(`Failed to delete override: ${error.message}`);
    } else {
      await logActivity(
        user,
        'price_override_deleted',
        'price_override',
        `Removed price override for ${selectedRoom?.name || selectedRoomSlug} (₹${override.price_per_night}/night, ${override.start_date} to ${override.end_date})`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, override_id: override.id, start_date: override.start_date, end_date: override.end_date, price_per_night: override.price_per_night },
      );
      setActionSuccess('Price override removed.');
      setPriceOverrides((prev) => prev.filter((o) => o.id !== override.id));
    }
    setUpdatingId(null);
  };

  const handlePhotoDelete = async (photo: RoomPhoto) => {
    setUpdatingId(photo.id);
    setActionError('');
    setActionSuccess('');

    const { error: storageError } = await supabase.storage
      .from('room-photos')
      .remove([photo.storage_path]);

    if (storageError) {
      setActionError(`Failed to delete file: ${storageError.message}`);
      setUpdatingId(null);
      return;
    }

    const { error: dbError } = await supabase
      .from('room_photos')
      .delete()
      .eq('id', photo.id);

    if (dbError) {
      setActionError(`Failed to delete photo record: ${dbError.message}`);
    } else {
      await logActivity(
        user,
        'photo_deleted',
        'photo',
        `Removed photo from ${selectedRoom?.name || selectedRoomSlug}`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, photo_id: photo.id },
      );
      setActionSuccess('Photo removed.');
      setRoomPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      refreshRooms();
    }
    setUpdatingId(null);
  };

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      !search ||
      b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_reference.toLowerCase().includes(search.toLowerCase()) ||
      b.guest_email.toLowerCase().includes(search.toLowerCase()) ||
      b.room_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.booking_status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || b.payment_status === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = bookings
    .filter((b) => {
      const created = new Date(b.created_at);
      return (
        b.booking_status !== 'Cancelled' &&
        b.payment_status === 'Paid' &&
        created.getMonth() === currentMonth &&
        created.getFullYear() === currentYear
      );
    })
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const pendingPayments = bookings.filter(
    (b) =>
      b.booking_status !== 'Cancelled' &&
      (b.payment_status === 'Pending Verification' || b.payment_status === 'Pay at Checkout')
  ).length;

  const totalRevenue = bookings
    .filter((b) => b.booking_status !== 'Cancelled' && b.payment_status === 'Paid')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.booking_status === 'Confirmed').length,
    pending: bookings.filter((b) => b.booking_status === 'Pending').length,
    monthlyRevenue,
    pendingPayments,
    totalRevenue,
  };

  const bookingStatusIcon = (status: string) => {
    if (status === 'Confirmed') return <CheckCircle size={14} className="text-green-400" />;
    if (status === 'Pending') return <Clock size={14} className="text-amber-400" />;
    return <XCircle size={14} className="text-red-400" />;
  };

  const bookingStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
      Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return colors[status] || colors.Pending;
  };

  const paymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Pending Verification': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Paid': 'bg-green-500/10 text-green-400 border-green-500/20',
      'Pay at Checkout': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Offline': 'bg-white/5 text-white/50 border-white/10',
    };
    return colors[status] || colors['Pending Verification'];
  };

  const canMarkPaid = (status: string) =>
    status === 'Pending Verification' || status === 'Pay at Checkout';

  const selectedRoom = ROOMS.find((r) => r.slug === selectedRoomSlug);

  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <div className="min-h-screen bg-[#1A1C1E]">
      <StaffHeader title="Manager Dashboard" subtitle="Bookings · Revenue · Rooms" />

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-sm border border-white/10 bg-[#22252a] p-5">
            <p className="text-xs uppercase tracking-wide text-white/40">Total Bookings</p>
            <p className="mt-2 font-heading text-3xl font-light text-white">{stats.total}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-[#22252a] p-5">
            <p className="text-xs uppercase tracking-wide text-white/40">Confirmed</p>
            <p className="mt-2 font-heading text-3xl font-light text-green-400">{stats.confirmed}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-[#22252a] p-5">
            <p className="text-xs uppercase tracking-wide text-white/40">Pending</p>
            <p className="mt-2 font-heading text-3xl font-light text-amber-400">{stats.pending}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-[#22252a] p-5">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-amber-200" />
              <p className="text-xs uppercase tracking-wide text-white/40">Revenue ({monthName})</p>
            </div>
            <p className="mt-2 font-heading text-2xl font-light text-amber-200">
              ₹{stats.monthlyRevenue.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="rounded-sm border border-white/10 bg-[#22252a] p-5">
            <div className="flex items-center gap-1.5">
              <Wallet size={12} className="text-blue-400" />
              <p className="text-xs uppercase tracking-wide text-white/40">Pending Payments</p>
            </div>
            <p className="mt-2 font-heading text-3xl font-light text-blue-400">{stats.pendingPayments}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-[#22252a] p-5">
            <div className="flex items-center gap-1.5">
              <BanknoteIcon size={12} className="text-green-400" />
              <p className="text-xs uppercase tracking-wide text-white/40">Total Revenue</p>
            </div>
            <p className="mt-2 font-heading text-2xl font-light text-green-400">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-sm border border-white/10 bg-[#22252a] p-1" style={{ scrollbarWidth: 'thin' }}>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-amber-200/10 text-amber-200'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <List size={14} />
              Bookings
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-amber-200/10 text-amber-200'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <CalendarDays size={14} />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('photos')}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                viewMode === 'photos'
                  ? 'bg-amber-200/10 text-amber-200'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <ImageIcon size={14} />
              Room Photos
            </button>
            <button
              onClick={() => setViewMode('pricing')}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                viewMode === 'pricing'
                  ? 'bg-amber-200/10 text-amber-200'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Tag size={14} />
              Pricing
            </button>
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                viewMode === 'edit'
                  ? 'bg-amber-200/10 text-amber-200'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Pencil size={14} />
              Edit Rooms
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                viewMode === 'gallery'
                  ? 'bg-amber-200/10 text-amber-200'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <ImageIcon size={14} />
              Gallery
            </button>
            <button
              onClick={() => setShowManualBooking(true)}
              className="flex items-center gap-2 rounded-sm bg-amber-200/10 px-4 py-2 text-xs font-medium text-amber-200 transition-all hover:bg-amber-200/20"
            >
              <CalendarPlus size={14} />
              Manual Booking
            </button>
          </div>

          {viewMode === 'list' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full flex-1 sm:max-w-sm">
                <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, reference..."
                  className="w-full rounded-sm border border-white/10 bg-[#22252a] py-2.5 pr-4 pl-10 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
                />
              </div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                className="rounded-sm border border-white/10 bg-[#22252a] px-3 py-2.5 text-xs text-white focus:border-amber-200/40 focus:outline-none"
              >
                <option value="all">All Payments</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Paid">Paid</option>
                <option value="Pay at Checkout">Pay at Checkout</option>
                <option value="Offline">Offline</option>
              </select>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {(['all', 'Confirmed', 'Pending', 'Cancelled'] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`shrink-0 rounded-sm border px-3 py-2 text-xs font-medium capitalize transition-all ${
                      statusFilter === f
                        ? 'border-amber-200/40 bg-amber-200/10 text-amber-200'
                        : 'border-white/10 bg-[#22252a] text-white/50 hover:text-white/80'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Room selector for calendar, photos, pricing, and edit */}
{(viewMode === 'calendar' || viewMode === 'photos' || viewMode === 'pricing' || viewMode === 'edit') && (
          <div className="mt-6 mb-2 flex flex-wrap gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {ROOMS.map((room) => (
              <button
                key={room.slug}
                onClick={() => setSelectedRoomSlug(room.slug)}
                className={`shrink-0 rounded-sm border px-4 py-2.5 text-sm font-medium transition-all sm:px-5 ${
                  selectedRoomSlug === room.slug
                    ? 'border-amber-200/40 bg-amber-200/10 text-amber-200'
                    : 'border-white/10 bg-[#22252a] text-white/50 hover:text-white/80'
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        )}

        {/* Action feedback */}
        {(actionError || actionSuccess) && (
          <div className={`mt-4 rounded-sm border p-4 text-sm ${
            actionError
              ? 'border-red-500/20 bg-red-500/5 text-red-400'
              : 'border-green-500/20 bg-green-500/5 text-green-400'
          }`}>
            {actionError || actionSuccess}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="mt-6 overflow-hidden rounded-sm border border-white/10">
            {loading ? (
              <div className="p-12 text-center text-sm text-white/40">Loading bookings...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-white/40">No bookings found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-[#22252a] text-xs uppercase tracking-wide text-white/40">
                    <tr>
                      <th className="px-4 py-3 font-medium">Reference</th>
                      <th className="px-4 py-3 font-medium">Guest</th>
                      <th className="px-4 py-3 font-medium">Room</th>
                      <th className="px-4 py-3 font-medium">Dates</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Pay Method</th>
                      <th className="px-4 py-3 font-medium">Pay Status</th>
                      <th className="px-4 py-3 font-medium">Booking</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((b) => (
                      <tr key={b.id} className="bg-[#1e2125] transition-colors hover:bg-[#25282d]">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-amber-200/70">{b.booking_reference}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{b.guest_name}</p>
                          <p className="text-xs text-white/40">{b.guest_email}</p>
                          <p className="text-xs text-white/40">{b.guest_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white/80">{b.room_name}</p>
                          <p className="text-xs text-white/40">{b.nights} nights · {b.number_of_rooms} room(s) · {b.guests} guests</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-white/60">{b.check_in}</p>
                          <p className="text-xs text-white/40">to {b.check_out}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-amber-200">₹{Number(b.total_price).toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="flex items-center gap-1.5 text-xs text-white/60">
                            {b.payment_method === 'Pay Now' ? <CreditCard size={11} /> : <Banknote size={11} />}
                            {b.payment_method}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${paymentStatusBadge(b.payment_status)}`}>
                            {b.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${bookingStatusBadge(b.booking_status)}`}>
                            {bookingStatusIcon(b.booking_status)}
                            {b.booking_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {canMarkPaid(b.payment_status) && (
                              <button
                                onClick={() => updatePaymentStatus(b, 'Paid')}
                                disabled={updatingId === b.id}
                                className="rounded-sm border border-green-500/20 bg-green-500/5 px-2.5 py-1 text-xs text-green-400 transition-all hover:bg-green-500/10 disabled:opacity-50"
                              >
                                Mark Paid
                              </button>
                            )}
                            {canMarkPaid(b.payment_status) && (
                              <button
                                onClick={() => updatePaymentStatus(b, 'Offline')}
                                disabled={updatingId === b.id}
                                className="rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 transition-all hover:bg-white/10 disabled:opacity-50"
                              >
                                Offline
                              </button>
                            )}
                            {b.booking_status !== 'Confirmed' && b.booking_status !== 'Cancelled' && (
                              <button
                                onClick={() => confirmBooking(b)}
                                disabled={updatingId === b.id}
                                className="rounded-sm border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-400 transition-all hover:bg-amber-500/10 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            )}
                            {b.booking_status !== 'Cancelled' && (
                              <button
                                onClick={() => updateBookingStatus(b, 'Cancelled')}
                                disabled={updatingId === b.id}
                                className="rounded-sm border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(b)}
                              disabled={updatingId === b.id}
                              className="rounded-sm border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="mt-6">
            {calendarLoading ? (
              <div className="rounded-sm border border-white/10 bg-[#22252a] p-12 text-center text-sm text-white/40">
                Loading calendar...
              </div>
            ) : selectedRoom ? (
              <>
                <BookingCalendar
                  roomName={selectedRoom.name}
                  bookedRanges={roomBookings}
                />
                {roomBookings.length > 0 && (
                  <div className="mt-6 rounded-sm border border-white/10 bg-[#22252a] p-6">
                    <h4 className="font-heading text-base font-medium text-white">
                      Active Bookings — {selectedRoom.name}
                    </h4>
                    <div className="mt-4 space-y-3">
                      {roomBookings.map((rb, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{rb.guest_name}</p>
                            <p className="text-xs text-white/40">
                              {rb.check_in} → {rb.check_out}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${bookingStatusBadge(rb.booking_status)}`}>
                            {bookingStatusIcon(rb.booking_status)}
                            {rb.booking_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Photos View */}
        {viewMode === 'photos' && (
          <div className="mt-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-medium text-white">
                  {selectedRoom?.name} — Photos
                </h3>
                <p className="mt-1 text-xs text-white/40">
                  Upload and manage photos for this room. Photos appear on the website.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-2 rounded-sm bg-amber-200/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-all hover:bg-amber-200/20 disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload Photo
                    </>
                  )}
                </button>
              </div>
            </div>

            {photosLoading ? (
              <div className="rounded-sm border border-white/10 bg-[#22252a] p-12 text-center text-sm text-white/40">
                Loading photos...
              </div>
            ) : roomPhotos.length === 0 ? (
              <div className="rounded-sm border border-dashed border-white/10 bg-[#22252a] p-16 text-center">
                <ImageIcon size={32} className="mx-auto text-white/20" />
                <p className="mt-4 text-sm text-white/40">No photos uploaded yet for {selectedRoom?.name}.</p>
                <p className="mt-1 text-xs text-white/30">Click "Upload Photo" to add one.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {roomPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-sm border border-white/10 bg-[#22252a]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={localizeMediaUrl(photo.photo_url)}
                        alt={`${selectedRoom?.name} photo`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/40" />
                      <button
                        onClick={() => handlePhotoDelete(photo)}
                        disabled={updatingId === photo.id}
                        className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 transition-all hover:bg-red-500 group-hover:opacity-100 disabled:opacity-50"
                        title="Remove photo"
                      >
                        {updatingId === photo.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pricing View */}
        {viewMode === 'pricing' && (
          <div className="mt-6 space-y-6">
            {/* Current default price */}
            <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-medium text-white">
                    {selectedRoom?.name} — Pricing
                  </h3>
                  <p className="mt-1 text-xs text-white/40">
                    Default rate: ₹{selectedRoom?.price.toLocaleString('en-IN')} / night
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-white/40">Active Overrides</p>
                  <p className="mt-1 font-heading text-2xl font-light text-amber-200">{priceOverrides.length}</p>
                </div>
              </div>
            </div>

            {/* Create override form */}
            <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
              <h4 className="flex items-center gap-2 font-heading text-base font-medium text-white">
                <Plus size={16} className="text-amber-200" />
                Add Custom Price for a Date Range
              </h4>
              <p className="mt-1 text-xs text-white/40">
                Set a custom per-night price for specific dates (e.g. holidays, weekends, off-season). Guests booking within this range will automatically see the custom price.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-white/40">Start Date</label>
                  <input
                    type="date"
                    value={newOverride.startDate}
                    onChange={(e) => setNewOverride({ ...newOverride, startDate: e.target.value })}
                    className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">End Date (inclusive)</label>
                  <input
                    type="date"
                    value={newOverride.endDate}
                    onChange={(e) => setNewOverride({ ...newOverride, endDate: e.target.value })}
                    className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Price / Night (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newOverride.pricePerNight}
                    onChange={(e) => setNewOverride({ ...newOverride, pricePerNight: e.target.value })}
                    placeholder="e.g. 6500"
                    className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Label (optional)</label>
                  <input
                    type="text"
                    value={newOverride.label}
                    onChange={(e) => setNewOverride({ ...newOverride, label: e.target.value })}
                    placeholder="e.g. New Year"
                    className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateOverride}
                disabled={savingOverride}
                className="mt-4 flex items-center gap-2 rounded-sm bg-amber-200/10 px-5 py-2.5 text-sm font-medium text-amber-200 transition-all hover:bg-amber-200/20 disabled:opacity-50"
              >
                {savingOverride ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Price Override
                  </>
                )}
              </button>
            </div>

            {/* Existing overrides */}
            <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
              <h4 className="font-heading text-base font-medium text-white">Active Price Overrides</h4>
              {overridesLoading ? (
                <div className="mt-4 text-center text-sm text-white/40">Loading overrides...</div>
              ) : priceOverrides.length === 0 ? (
                <div className="mt-4 rounded-sm border border-dashed border-white/10 p-8 text-center">
                  <Tag size={24} className="mx-auto text-white/20" />
                  <p className="mt-3 text-sm text-white/40">No custom prices set for {selectedRoom?.name}.</p>
                  <p className="mt-1 text-xs text-white/30">All bookings use the default rate of ₹{selectedRoom?.price.toLocaleString('en-IN')} / night.</p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Start Date</th>
                        <th className="px-3 py-2 font-medium">End Date</th>
                        <th className="px-3 py-2 font-medium">Price / Night</th>
                        <th className="px-3 py-2 font-medium">Label</th>
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {priceOverrides.map((o) => (
                        <tr key={o.id} className="bg-[#1e2125] hover:bg-[#25282d]">
                          <td className="px-3 py-3 text-white/80">{o.start_date}</td>
                          <td className="px-3 py-3 text-white/80">{o.end_date}</td>
                          <td className="px-3 py-3 font-medium text-amber-200">₹{Number(o.price_per_night).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-3 text-white/50">{o.label || '—'}</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handleDeleteOverride(o)}
                              disabled={updatingId === o.id}
                              className="flex items-center gap-1.5 rounded-sm border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {updatingId === o.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Room View */}
        {viewMode === 'edit' && (
          <div className="mt-6">
            <RoomEditor room={selectedRoom} roomSlug={selectedRoomSlug} actor={user} onSaved={refreshRooms} />
          </div>
        )}

        {viewMode === 'gallery' && (
          <div className="mt-6">
            <GalleryManager actor={user ? { id: user.id, email: user.email, role: user.role } : null} />
          </div>
        )}

        {/* Delete Booking Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-sm border border-white/10 bg-[#22252a] p-6">
              <h3 className="font-heading text-lg font-medium text-white">Delete Booking?</h3>
              <p className="mt-2 text-sm text-white/60">
                You are about to permanently delete booking <span className="font-mono text-amber-200">{deleteTarget.booking_reference}</span> for <span className="text-white">{deleteTarget.guest_name}</span> ({deleteTarget.room_name}, {deleteTarget.check_in} to {deleteTarget.check_out}). This cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={updatingId === deleteTarget.id}
                  className="rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteBooking(deleteTarget)}
                  disabled={updatingId === deleteTarget.id}
                  className="flex items-center gap-2 rounded-sm bg-red-500/80 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-500 disabled:opacity-50"
                >
                  {updatingId === deleteTarget.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Booking Modal */}
        {showManualBooking && (
          <ManualBookingModal
            rooms={ROOMS}
            actor={user}
            onClose={() => setShowManualBooking(false)}
            onCreated={() => {
              fetchBookings();
              if (viewMode === 'calendar') fetchCalendarBookings(selectedRoomSlug);
            }}
          />
        )}

        {/* Staff Info */}
        <div className="mt-8 rounded-sm border border-white/10 bg-[#22252a] p-6">
          <h3 className="font-heading text-lg font-medium text-white">Staff Account</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200/10">
              <span className="text-sm font-medium text-amber-200">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-amber-200/60">Role: {user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
