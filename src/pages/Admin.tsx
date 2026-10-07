import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, localizeMediaUrl } from '@/lib/supabase';
import StaffHeader from '@/components/StaffHeader';
import { Users, CheckCircle, Clock, XCircle, Search, CreditCard, Banknote, AlertCircle, Mail, UserPlus, Loader2, Shield, History, Pencil, CalendarPlus, Tag, ImageIcon, Upload, Trash2, List } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { checkRoomAvailability } from '@/lib/availability';
import { useRooms } from '@/lib/rooms';
import { fetchPriceOverrides, type PriceOverride } from '@/lib/pricing';
import { logActivity } from '@/lib/activity';
import RoomEditor from '@/components/RoomEditor';
import ManualBookingModal from '@/components/ManualBookingModal';
import ActivityLog from '@/components/ActivityLog';
import GalleryManager from '@/components/GalleryManager';
import SmartImage from '@/components/SmartImage';

interface StaffMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
  banned?: boolean;
}

interface InviteResult {
  email: string;
  status: 'invited' | 'exists' | 'error';
  message: string;
}

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

type AdminTab = 'bookings' | 'rooms' | 'gallery' | 'activity';
type RoomViewMode = 'list' | 'calendar' | 'photos' | 'pricing' | 'edit';

type StatusFilter = 'all' | 'Confirmed' | 'Pending' | 'Cancelled';

const BOOKING_STATUSES = ['Confirmed', 'Pending', 'Cancelled'] as const;
const PAYMENT_STATUSES = ['Pending Verification', 'Paid', 'Pay at Checkout', 'Offline'] as const;

export default function Admin() {
  const { user } = useAuth();
  const { rooms: ROOMS, refresh: refreshRooms } = useRooms();
  const [activeTab, setActiveTab] = useState<AdminTab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState('');

  // Staff management state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<'Manager' | 'Staff'>('Staff');
  const [inviting, setInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResult[] | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [staffActionLoading, setStaffActionLoading] = useState<string | null>(null);

  // Room management state
  const [roomViewMode, setRoomViewMode] = useState<RoomViewMode>('list');
  const [selectedRoomSlug, setSelectedRoomSlug] = useState(ROOMS[0]?.slug || '');
  const [roomPhotos, setRoomPhotos] = useState<Array<{ id: string; room_slug: string; photo_url: string; storage_path: string; created_at: string; sort_order: number }>>([]);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [newOverride, setNewOverride] = useState({ startDate: '', endDate: '', pricePerNight: '', label: '' });
  const [savingOverride, setSavingOverride] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [roomActionError, setRoomActionError] = useState('');
  const [roomActionSuccess, setRoomActionSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Activity log state
  const [activityActorId, setActivityActorId] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStaffLoading(false);
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-managers`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch staff');
      const data = await response.json();
      setStaff(data.staff || []);
    } catch {
      setStaff([]);
    }
    setStaffLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleInvite = async () => {
    const emails = inviteEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setInviteError('Please enter at least one email address.');
      return;
    }

    setInviting(true);
    setInviteError('');
    setInviteResults(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setInviteError('Authentication required.');
      setInviting(false);
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-managers`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ emails, role: inviteRole }),
      });

      if (!response.ok) {
        const errData = await response.json();
        setInviteError(errData.error || 'Failed to send invitations.');
      } else {
        const data = await response.json();
        setInviteResults(data.results || []);
        setInviteEmails('');
        fetchStaff();
      }
    } catch {
      setInviteError('Network error. Please try again.');
    }
    setInviting(false);
  };

  const handleStaffAction = async (userId: string, action: string, role?: string) => {
    setStaffActionLoading(userId);
    setInviteError('');
    setInviteResults(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-managers`;
      const { data: session } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`;
      }
      const body: Record<string, unknown> = { userId, action };
      if (action === 'setRole' && role) body.role = role;
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setInviteError(data.error || 'Failed to update staff member.');
      } else {
        fetchStaff();
      }
    } catch {
      setInviteError('Network error. Please try again.');
    }
    setStaffActionLoading(null);
  };

  const updateField = async (id: string, field: 'booking_status' | 'payment_status', value: string) => {
    setUpdatingId(id);
    setConfirmError('');
    const booking = bookings.find((b) => b.id === id);
    const { error } = await supabase
      .from('bookings')
      .update({ [field]: value })
      .eq('id', id);

    if (!error) {
      if (booking) {
        await logActivity(
          user,
          field === 'payment_status' ? 'payment_status_changed' : 'booking_status_changed',
          'booking',
          `${field === 'payment_status' ? 'Marked' : 'Changed'} booking ${booking.booking_reference} ${field === 'payment_status' ? 'payment' : 'status'} to "${value}"`,
          booking.booking_reference,
          { booking_reference: booking.booking_reference, old_status: booking[field], new_status: value, guest_name: booking.guest_name },
        );
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
      );
    }
    setUpdatingId(null);
  };

  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  const handleDeleteBooking = async (booking: Booking) => {
    setUpdatingId(booking.id);
    setConfirmError('');
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
    } else {
      setConfirmError('Failed to delete booking.');
    }
    setUpdatingId(null);
    setDeleteTarget(null);
  };

  const confirmBooking = async (booking: Booking) => {
    setUpdatingId(booking.id);
    setConfirmError('');

    const { available } = await checkRoomAvailability(
      booking.room_id,
      booking.check_in,
      booking.check_out,
      booking.id
    );

    if (!available) {
      setConfirmError(`This room is not available for the selected dates. ${booking.room_name} is already booked for ${booking.check_in} to ${booking.check_out}.`);
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
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.booking_status === 'Confirmed').length,
    pending: bookings.filter((b) => b.booking_status === 'Pending').length,
    revenue: bookings
      .filter((b) => b.booking_status !== 'Cancelled')
      .reduce((sum, b) => sum + Number(b.total_price), 0),
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

  // Room management functions
  const selectedRoom = ROOMS.find((r) => r.slug === selectedRoomSlug);

  const fetchRoomPhotos = useCallback(async (slug: string) => {
    const { data, error } = await supabase
      .from('room_photos')
      .select('*')
      .eq('room_slug', slug)
      .order('sort_order', { ascending: true });
    if (!error && data) setRoomPhotos(data);
  }, []);

  const fetchOverrides = useCallback(async (slug: string) => {
    const data = await fetchPriceOverrides(slug);
    setPriceOverrides(data);
  }, []);

  useEffect(() => {
    if (!selectedRoomSlug && ROOMS.length > 0) {
      setSelectedRoomSlug(ROOMS[0].slug);
    }
  }, [ROOMS, selectedRoomSlug]);

  useEffect(() => {
    if (selectedRoomSlug && roomViewMode === 'photos') fetchRoomPhotos(selectedRoomSlug);
    if (selectedRoomSlug && roomViewMode === 'pricing') fetchOverrides(selectedRoomSlug);
  }, [selectedRoomSlug, roomViewMode, fetchRoomPhotos, fetchOverrides]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoomSlug) return;
    setUploadingPhoto(true);
    setRoomActionError('');
    setRoomActionSuccess('');

    const fileExt = file.name.split('.').pop();
    const fileName = `${selectedRoomSlug}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('room-photos')
      .upload(fileName, file);

    if (uploadError) {
      setRoomActionError(`Upload failed: ${uploadError.message}`);
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('room-photos')
      .getPublicUrl(fileName);

    const { error: dbError } = await supabase
      .from('room_photos')
      .insert({
        room_slug: selectedRoomSlug,
        photo_url: urlData.publicUrl,
        storage_path: fileName,
        sort_order: roomPhotos.length,
      });

    if (dbError) {
      setRoomActionError(`Failed to save photo record: ${dbError.message}`);
    } else {
      await logActivity(
        user,
        'photo_uploaded',
        'photo',
        `Uploaded photo for ${selectedRoom?.name || selectedRoomSlug}`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, photo_url: urlData.publicUrl },
      );
      setRoomActionSuccess('Photo uploaded successfully.');
      fetchRoomPhotos(selectedRoomSlug);
      refreshRooms();
    }
    setUploadingPhoto(false);
    if (e.target) e.target.value = '';
  };

  const handleDeletePhoto = async (photo: { id: string; room_slug: string; photo_url: string; storage_path: string }) => {
    setUpdatingId(photo.id);
    setRoomActionError('');
    setRoomActionSuccess('');

    if (photo.storage_path) {
      await supabase.storage.from('room-photos').remove([photo.storage_path]);
    }

    const { error: dbError } = await supabase
      .from('room_photos')
      .delete()
      .eq('id', photo.id);

    if (dbError) {
      setRoomActionError(`Failed to delete photo record: ${dbError.message}`);
    } else {
      await logActivity(
        user,
        'photo_deleted',
        'photo',
        `Removed photo from ${selectedRoom?.name || selectedRoomSlug}`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, photo_id: photo.id },
      );
      setRoomActionSuccess('Photo removed.');
      setRoomPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      refreshRooms();
    }
    setUpdatingId(null);
  };

  const handleCreateOverride = async () => {
    if (!selectedRoomSlug || !newOverride.startDate || !newOverride.endDate || !newOverride.pricePerNight) {
      setRoomActionError('All fields are required for a price override.');
      return;
    }
    setSavingOverride(true);
    setRoomActionError('');
    setRoomActionSuccess('');

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
      setRoomActionError(`Failed to create price override: ${error.message}`);
    } else {
      await logActivity(
        user,
        'price_override_created',
        'price_override',
        `Added price override for ${selectedRoom?.name || selectedRoomSlug}: ₹${newOverride.pricePerNight}/night (${newOverride.startDate} to ${newOverride.endDate})`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, start_date: newOverride.startDate, end_date: newOverride.endDate, price_per_night: newOverride.pricePerNight, label: newOverride.label },
      );
      setRoomActionSuccess('Price override created successfully.');
      setNewOverride({ startDate: '', endDate: '', pricePerNight: '', label: '' });
      fetchOverrides(selectedRoomSlug);
    }
    setSavingOverride(false);
  };

  const handleDeleteOverride = async (override: PriceOverride) => {
    setUpdatingId(override.id);
    setRoomActionError('');
    setRoomActionSuccess('');

    const { error } = await supabase
      .from('room_price_overrides')
      .delete()
      .eq('id', override.id);

    if (error) {
      setRoomActionError(`Failed to delete override: ${error.message}`);
    } else {
      await logActivity(
        user,
        'price_override_deleted',
        'price_override',
        `Removed price override for ${selectedRoom?.name || selectedRoomSlug} (₹${override.price_per_night}/night, ${override.start_date} to ${override.end_date})`,
        selectedRoomSlug,
        { room_slug: selectedRoomSlug, override_id: override.id, start_date: override.start_date, end_date: override.end_date, price_per_night: override.price_per_night },
      );
      setRoomActionSuccess('Price override removed.');
      setPriceOverrides((prev) => prev.filter((o) => o.id !== override.id));
    }
    setUpdatingId(null);
  };

  // Manager list for activity log filter
  const managers = staff.filter((s) => s.role === 'Manager');

  return (
    <div className="min-h-screen bg-[#1A1C1E]">
      <StaffHeader title="Admin Dashboard" subtitle="Full access · Bookings, Rooms & Activity" />

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 overflow-x-auto border-b border-white/10 pb-4" style={{ scrollbarWidth: 'thin' }}>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'bookings'
                ? 'bg-amber-200/10 text-amber-200'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <List size={16} />
            Bookings
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'rooms'
                ? 'bg-amber-200/10 text-amber-200'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Pencil size={16} />
            Room Management
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'gallery'
                ? 'bg-amber-200/10 text-amber-200'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <ImageIcon size={16} />
            Gallery
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'activity'
                ? 'bg-amber-200/10 text-amber-200'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <History size={16} />
            Activity Log
          </button>
        </div>
        {/* === BOOKINGS TAB === */}
        {activeTab === 'bookings' && (
        <>
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="text-xs uppercase tracking-wide text-white/40">Revenue (Active)</p>
            <p className="mt-2 font-heading text-3xl font-light text-amber-200">
              ₹{stats.revenue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {(['all', 'Confirmed', 'Pending', 'Cancelled'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`shrink-0 rounded-sm border px-4 py-2 text-xs font-medium capitalize transition-all ${
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

        {confirmError && (
          <div className="mt-4 flex items-start gap-3 rounded-sm border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{confirmError}</p>
          </div>
        )}

        {/* Bookings Table */}
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
                    <th className="px-4 py-3 font-medium">Payment</th>
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
                        <p className="flex items-center gap-1 text-xs text-white/40">
                          {b.payment_method === 'Pay Now' ? <CreditCard size={10} /> : <Banknote size={10} />}
                          {b.payment_method}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={b.payment_status}
                          onChange={(e) => updateField(b.id, 'payment_status', e.target.value)}
                          disabled={updatingId === b.id}
                          className={`rounded-sm border px-2 py-1 text-xs font-medium ${paymentStatusBadge(b.payment_status)} focus:outline-none disabled:opacity-50`}
                        >
                          {PAYMENT_STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-[#22252a] text-white">{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${bookingStatusBadge(b.booking_status)}`}>
                          {bookingStatusIcon(b.booking_status)}
                          {b.booking_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {b.booking_status !== 'Confirmed' && (
                            <button
                              onClick={() => confirmBooking(b)}
                              disabled={updatingId === b.id}
                              className="rounded-sm border border-green-500/20 bg-green-500/5 px-2.5 py-1 text-xs text-green-400 transition-all hover:bg-green-500/10 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          )}
                          {b.booking_status !== 'Cancelled' && (
                            <button
                              onClick={() => updateField(b.id, 'booking_status', 'Cancelled')}
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

        {/* Delete Booking Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-sm border border-white/10 bg-[#22252a] p-6">
              <h3 className="font-heading text-lg font-medium text-white">Delete Booking?</h3>
              <p className="mt-2 text-sm text-white/60">
                You are about to permanently delete booking <span className="font-mono text-amber-200">{deleteTarget.booking_reference}</span> for <span className="text-white">{deleteTarget.guest_name}</span> ({deleteTarget.room_name}, {deleteTarget.check_in} to {deleteTarget.check_out}). This cannot be undone.
              </p>
              {confirmError && (
                <p className="mt-3 text-sm text-red-400">{confirmError}</p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setDeleteTarget(null); setConfirmError(''); }}
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

        {/* Invite Managers */}
        <div className="mt-8 rounded-sm border border-white/10 bg-[#22252a] p-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-medium text-white">
            <UserPlus size={18} className="text-amber-200" />
            Invite Staff Accounts
          </h3>
          <p className="mt-1 text-xs text-white/40">
            Enter one or more email addresses (comma or new-line separated). Each person will receive an email invitation to set their own password and log in.
          </p>

          {inviteError && (
            <div className="mt-4 flex items-start gap-2 rounded-sm bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteResults && inviteResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {inviteResults.map((r) => (
                <div
                  key={r.email}
                  className={`flex items-center gap-2 rounded-sm border p-3 text-xs ${
                    r.status === 'invited'
                      ? 'border-green-500/20 bg-green-500/5 text-green-400'
                      : r.status === 'exists'
                        ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                        : 'border-red-500/20 bg-red-500/5 text-red-400'
                  }`}
                >
                  {r.status === 'invited' ? (
                    <CheckCircle size={14} className="shrink-0" />
                  ) : r.status === 'exists' ? (
                    <Clock size={14} className="shrink-0" />
                  ) : (
                    <XCircle size={14} className="shrink-0" />
                  )}
                  <span className="font-medium">{r.email}</span>
                  <span className="text-white/40">— {r.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-white/40">Email Addresses</label>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={4}
              placeholder="manager1@example.com, manager2@example.com"
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
            />
            </div>
            <div className="sm:w-40">
              <label className="mb-1 block text-xs text-white/40">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'Manager' | 'Staff')}
                className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white focus:border-amber-200/40 focus:outline-none"
              >
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleInvite}
            disabled={inviting}
            className="mt-4 flex items-center gap-2 rounded-sm bg-amber-200/10 px-5 py-2.5 text-sm font-medium text-amber-200 transition-all hover:bg-amber-200/20 disabled:opacity-50"
          >
            {inviting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending Invitations...
              </>
            ) : (
              <>
                <Mail size={16} />
                Send Invitations
              </>
            )}
          </button>
        </div>

        {/* Staff Directory */}
        <div className="mt-6 rounded-sm border border-white/10 bg-[#22252a] p-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-medium text-white">
            <Users size={18} className="text-amber-200" />
            Staff Directory
          </h3>
          <p className="mt-1 text-xs text-white/40">
            All accounts with access to the staff portal.
          </p>

          {staffLoading ? (
            <div className="mt-4 text-center text-sm text-white/40">Loading staff...</div>
          ) : staff.length === 0 ? (
            <div className="mt-4 rounded-sm border border-dashed border-white/10 p-6 text-center">
              <p className="text-sm text-white/40">No staff accounts found.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Added</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staff.map((s) => (
                    <tr key={s.id} className="bg-[#1e2125] hover:bg-[#25282d]">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {s.role === 'Admin' ? (
                            <Shield size={14} className="text-amber-200" />
                          ) : (
                            <Users size={14} className="text-white/30" />
                          )}
                          <span className="text-white/80">{s.email}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            s.role === 'Admin'
                              ? 'border-amber-200/20 bg-amber-200/10 text-amber-200'
                              : s.role === 'Manager'
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                : 'border-white/10 bg-white/5 text-white/50'
                          }`}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            s.banned
                              ? 'border-red-500/20 bg-red-500/10 text-red-400'
                              : 'border-green-500/20 bg-green-500/10 text-green-400'
                          }`}
                        >
                          {s.banned ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-white/40">
                        {new Date(s.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        {s.role !== 'Admin' && (
                          <div className="flex flex-wrap gap-1">
                            <select
                              value={s.role}
                              onChange={(e) => handleStaffAction(s.id, 'setRole', e.target.value)}
                              disabled={staffActionLoading === s.id}
                              className="rounded-sm border border-white/10 bg-[#1e2125] px-2 py-1 text-xs text-white focus:outline-none disabled:opacity-50"
                            >
                              <option value="Staff">Staff</option>
                              <option value="Manager">Manager</option>
                            </select>
                            {s.banned ? (
                              <button
                                onClick={() => handleStaffAction(s.id, 'reactivate')}
                                disabled={staffActionLoading === s.id}
                                className="rounded-sm border border-green-500/20 bg-green-500/5 px-2.5 py-1 text-xs text-green-400 transition-all hover:bg-green-500/10 disabled:opacity-50"
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStaffAction(s.id, 'deactivate')}
                                disabled={staffActionLoading === s.id}
                                className="rounded-sm border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            )}
                            <button
                              onClick={() => handleStaffAction(s.id, 'resetPassword')}
                              disabled={staffActionLoading === s.id}
                              className="rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 transition-all hover:bg-white/10 disabled:opacity-50"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Current Admin Info */}
        <div className="mt-6 rounded-sm border border-white/10 bg-[#22252a] p-6">
          <h3 className="font-heading text-lg font-medium text-white">Your Account</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200/10">
              <Shield size={18} className="text-amber-200" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-amber-200/60">Role: {user?.role}</p>
            </div>
          </div>
        </div>
          </>
        )}

        {/* === ROOM MANAGEMENT TAB === */}
        {activeTab === 'rooms' && (
          <div className="mt-8">
            {/* Room management tabs */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              <button
                onClick={() => setRoomViewMode('list')}
                className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                  roomViewMode === 'list' ? 'bg-amber-200/10 text-amber-200' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <List size={14} />
                Rooms
              </button>
              <button
                onClick={() => setRoomViewMode('edit')}
                className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                  roomViewMode === 'edit' ? 'bg-amber-200/10 text-amber-200' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Pencil size={14} />
                Edit Rooms
              </button>
              <button
                onClick={() => setRoomViewMode('photos')}
                className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                  roomViewMode === 'photos' ? 'bg-amber-200/10 text-amber-200' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <ImageIcon size={14} />
                Photos
              </button>
              <button
                onClick={() => setRoomViewMode('pricing')}
                className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                  roomViewMode === 'pricing' ? 'bg-amber-200/10 text-amber-200' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Tag size={14} />
                Pricing
              </button>
              <button
                onClick={() => setShowManualBooking(true)}
                className="flex shrink-0 items-center gap-2 rounded-sm bg-amber-200/10 px-4 py-2 text-xs font-medium text-amber-200 transition-all hover:bg-amber-200/20"
              >
                <CalendarPlus size={14} />
                Manual Booking
              </button>
            </div>

            {/* Room selector */}
            {(roomViewMode === 'edit' || roomViewMode === 'photos' || roomViewMode === 'pricing') && (
              <div className="mt-4">
                <label className="mb-1 block text-xs text-white/40">Select Room</label>
                <select
                  value={selectedRoomSlug}
                  onChange={(e) => setSelectedRoomSlug(e.target.value)}
                  className="rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
                >
                  {ROOMS.map((r) => (
                    <option key={r.slug} value={r.slug}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Room list view */}
            {roomViewMode === 'list' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ROOMS.map((room) => (
                  <div key={room.slug} className="overflow-hidden rounded-sm border border-white/10 bg-[#22252a]">
                    <div className="relative h-40">
                      <SmartImage src={room.images[0]} alt={room.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-4">
                      <h4 className="font-heading text-base font-medium text-white">{room.name}</h4>
                      <p className="mt-1 text-xs text-white/40">₹{room.price.toLocaleString('en-IN')}/night · {room.capacity} guests</p>
                      <button
                        onClick={() => { setSelectedRoomSlug(room.slug); setRoomViewMode('edit'); }}
                        className="mt-3 flex items-center gap-1.5 text-xs text-amber-200/70 transition-all hover:text-amber-200"
                      >
                        <Pencil size={12} />
                        Edit this room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit room view */}
            {roomViewMode === 'edit' && (
              <div className="mt-6">
                <RoomEditor room={selectedRoom} roomSlug={selectedRoomSlug} actor={user} onSaved={refreshRooms} />
              </div>
            )}

            {/* Photos view */}
            {roomViewMode === 'photos' && (
              <div className="mt-6">
                {roomActionError && (
                  <div className="mb-4 flex items-start gap-2 rounded-sm bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{roomActionError}</span>
                  </div>
                )}
                {roomActionSuccess && (
                  <div className="mb-4 flex items-start gap-2 rounded-sm bg-green-500/10 p-3 text-sm text-green-400">
                    <CheckCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{roomActionSuccess}</span>
                  </div>
                )}

                <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
                  <h4 className="font-heading text-base font-medium text-white">Upload New Photo</h4>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="admin-photo-upload"
                    />
                    <label
                      htmlFor="admin-photo-upload"
                      className="flex cursor-pointer items-center gap-2 rounded-sm bg-amber-200/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-all hover:bg-amber-200/20"
                    >
                      {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingPhoto ? 'Uploading...' : 'Choose Image'}
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="mb-4 font-heading text-base font-medium text-white">Current Photos</h4>
                    {roomPhotos.length === 0 ? (
                      <p className="text-sm text-white/40">No photos uploaded yet.</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {roomPhotos.map((photo) => (
                          <div key={photo.id} className="group relative overflow-hidden rounded-sm border border-white/10">
                            <SmartImage src={localizeMediaUrl(photo.photo_url)} alt="Room" className="h-32 w-full object-cover" />
                            <button
                              onClick={() => handleDeletePhoto(photo)}
                              disabled={updatingId === photo.id}
                              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-red-400 opacity-0 transition-all hover:bg-red-500/40 group-hover:opacity-100 disabled:opacity-50"
                            >
                              {updatingId === photo.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Pricing view */}
            {roomViewMode === 'pricing' && (
              <div className="mt-6">
                {roomActionError && (
                  <div className="mb-4 flex items-start gap-2 rounded-sm bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{roomActionError}</span>
                  </div>
                )}
                {roomActionSuccess && (
                  <div className="mb-4 flex items-start gap-2 rounded-sm bg-green-500/10 p-3 text-sm text-green-400">
                    <CheckCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{roomActionSuccess}</span>
                  </div>
                )}

                <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
                  <h4 className="font-heading text-base font-medium text-white">Add Price Override</h4>
                  <p className="mt-1 text-xs text-white/40">Set a custom price for specific dates (e.g. festival season, holiday weekend).</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs text-white/40">Start Date</label>
                      <input type="date" value={newOverride.startDate} onChange={(e) => setNewOverride({ ...newOverride, startDate: e.target.value })} className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/40">End Date</label>
                      <input type="date" value={newOverride.endDate} onChange={(e) => setNewOverride({ ...newOverride, endDate: e.target.value })} className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/40">Price/Night (₹)</label>
                      <input type="number" min="0" value={newOverride.pricePerNight} onChange={(e) => setNewOverride({ ...newOverride, pricePerNight: e.target.value })} className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/40">Label (optional)</label>
                      <input type="text" value={newOverride.label} onChange={(e) => setNewOverride({ ...newOverride, label: e.target.value })} className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none" />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateOverride}
                    disabled={savingOverride}
                    className="mt-4 flex items-center gap-2 rounded-sm bg-amber-200/10 px-5 py-2.5 text-sm font-medium text-amber-200 transition-all hover:bg-amber-200/20 disabled:opacity-50"
                  >
                    {savingOverride ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
                    {savingOverride ? 'Saving...' : 'Add Override'}
                  </button>
                </div>

                <div className="mt-6">
                  <h4 className="mb-4 font-heading text-base font-medium text-white">Current Overrides</h4>
                  {priceOverrides.length === 0 ? (
                    <p className="text-sm text-white/40">No price overrides set.</p>
                  ) : (
                    <div className="overflow-hidden rounded-sm border border-white/10">
                      <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10 bg-[#22252a] text-xs uppercase tracking-wide text-white/40">
                          <tr>
                            <th className="px-4 py-3 font-medium">Start</th>
                            <th className="px-4 py-3 font-medium">End</th>
                            <th className="px-4 py-3 font-medium">Price/Night</th>
                            <th className="px-4 py-3 font-medium">Label</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {priceOverrides.map((o) => (
                            <tr key={o.id} className="bg-[#1e2125] hover:bg-[#25282d]">
                              <td className="px-4 py-3 text-white/80">{o.start_date}</td>
                              <td className="px-4 py-3 text-white/80">{o.end_date}</td>
                              <td className="px-4 py-3 font-medium text-amber-200">₹{o.price_per_night.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-white/60">{o.label || '—'}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteOverride(o)}
                                  disabled={updatingId === o.id}
                                  className="flex items-center gap-1 rounded-sm border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                                >
                                  {updatingId === o.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual Booking Modal */}
            {showManualBooking && (
              <ManualBookingModal
                rooms={ROOMS}
                actor={user}
                onClose={() => setShowManualBooking(false)}
                onCreated={() => fetchBookings()}
              />
            )}
          </div>
        )}

        {/* === GALLERY TAB === */}
        {activeTab === 'gallery' && (
          <div className="mt-8">
            <GalleryManager actor={user ? { id: user.id, email: user.email, role: user.role } : null} />
          </div>
        )}

        {/* === ACTIVITY LOG TAB === */}
        {activeTab === 'activity' && (
          <div className="mt-8 space-y-6">
            {/* Manager selector */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="mb-1 block text-xs text-white/40">Filter by Manager</label>
                <select
                  value={activityActorId || ''}
                  onChange={(e) => setActivityActorId(e.target.value || undefined)}
                  className="rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
                >
                  <option value="">All Managers & Admins</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <ActivityLog actorId={activityActorId} maxHeight="700px" />
          </div>
        )}

      </div>
    </div>
  );
}
