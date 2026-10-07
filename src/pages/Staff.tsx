import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { logActivity } from '@/lib/activity';
import {
  LayoutDashboard,
  LogOut,
  CalendarCheck,
  CalendarX,
  BedDouble,
  Users,
  ListTodo,
  UserCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Plus,
  StickyNote,
  Sparkle,
  AlertCircle,
  Wrench,
  Brush,
  CheckCircle2,
} from 'lucide-react';

type StaffTab = 'dashboard' | 'arrivals' | 'departures' | 'rooms' | 'guests' | 'tasks' | 'profile';

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

interface BookingNote {
  id: string;
  booking_id: string;
  note: string;
  created_by: string;
  created_by_email: string;
  created_at: string;
}

interface RoomStatus {
  room_slug: string;
  status: string;
  updated_at: string;
}

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_by: string;
  created_at: string;
}

const ROOM_STATUSES = ['Available', 'Occupied', 'Cleaning', 'Maintenance'] as const;
type RoomStatusValue = (typeof ROOM_STATUSES)[number];

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const;

export default function Staff() {
  const { user, signOut } = useAuth();
  const { rooms: ROOMS } = useRooms();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StaffTab>('dashboard');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomStatuses, setRoomStatuses] = useState<RoomStatus[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [notes, setNotes] = useState<BookingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteBookingId, setNoteBookingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('check_in', { ascending: true });
    if (!error && data) setBookings(data as Booking[]);
  }, []);

  const fetchRoomStatuses = useCallback(async () => {
    const { data, error } = await supabase
      .from('room_statuses')
      .select('*');
    if (!error && data) setRoomStatuses(data as RoomStatus[]);
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('staff_tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setTasks(data as StaffTask[]);
  }, []);

  const fetchNotes = useCallback(async (bookingId: string) => {
    const { data, error } = await supabase
      .from('booking_notes')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (!error && data) setNotes(data as BookingNote[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchBookings(), fetchRoomStatuses(), fetchTasks()]);
      setLoading(false);
    })();
  }, [fetchBookings, fetchRoomStatuses, fetchTasks]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/staff-login');
  };

  const todayArrivals = bookings.filter(
    (b) => b.check_in === today && b.booking_status !== 'Cancelled'
  );
  const todayDepartures = bookings.filter(
    (b) => b.check_out === today && b.booking_status !== 'Cancelled'
  );
  const upcomingArrivals = bookings.filter(
    (b) => b.check_in > today && b.booking_status !== 'Cancelled'
  );
  const currentGuests = bookings.filter(
    (b) => b.check_in <= today && b.check_out > today && b.booking_status === 'Confirmed'
  );

  const getStatusForRoom = (slug: string): string => {
    const rs = roomStatuses.find((s) => s.room_slug === slug);
    return rs?.status || 'Available';
  };

  const updateRoomStatus = async (slug: string, status: RoomStatusValue) => {
    setUpdatingId(slug);
    setActionError('');
    setActionSuccess('');
    const { error } = await supabase
      .from('room_statuses')
      .upsert({ room_slug: slug, status, updated_by: user?.id }, { onConflict: 'room_slug' });
    if (!error) {
      setRoomStatuses((prev) => {
        const existing = prev.find((s) => s.room_slug === slug);
        if (existing) {
          return prev.map((s) => (s.room_slug === slug ? { ...s, status, updated_at: new Date().toISOString() } : s));
        }
        return [...prev, { room_slug: slug, status, updated_at: new Date().toISOString() }];
      });
      setActionSuccess(`Room marked as ${status}.`);
    } else {
      setActionError('Failed to update room status.');
    }
    setUpdatingId(null);
  };

  const addNote = async (bookingId: string) => {
    if (!noteText.trim()) return;
    setActionError('');
    const { data, error } = await supabase
      .from('booking_notes')
      .insert({
        booking_id: bookingId,
        note: noteText.trim(),
        created_by: user?.id,
        created_by_email: user?.email || '',
      })
      .select('*')
      .single();
    if (!error && data) {
      setNotes((prev) => [data as BookingNote, ...prev]);
      setNoteText('');
      await logActivity(
        user,
        'booking_status_changed' as never,
        'booking',
        `Added note to booking ${bookings.find((b) => b.id === bookingId)?.booking_reference || ''}`,
        bookings.find((b) => b.id === bookingId)?.booking_reference,
        { note: noteText.trim() }
      );
    } else {
      setActionError('Failed to add note.');
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    setUpdatingId(taskId);
    setActionError('');
    const { error } = await supabase
      .from('staff_tasks')
      .update({ status })
      .eq('id', taskId);
    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    } else {
      setActionError('Failed to update task.');
    }
    setUpdatingId(null);
  };

  const openBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setNoteBookingId(booking.id);
    fetchNotes(booking.id);
  };

  const myTasks = tasks.filter((t) => t.assigned_to === user?.id);
  const allOpenTasks = tasks.filter((t) => t.status !== 'Completed');

  const navItems: { id: StaffTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'arrivals', label: "Today's Arrivals", icon: CalendarCheck },
    { id: 'departures', label: "Today's Departures", icon: CalendarX },
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'profile', label: 'Profile', icon: UserCircle },
  ];

  const statusIcon = (status: string) => {
    if (status === 'Confirmed') return <CheckCircle size={14} className="text-green-400" />;
    if (status === 'Pending') return <Clock size={14} className="text-amber-400" />;
    return <XCircle size={14} className="text-red-400" />;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
      Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return colors[status] || colors.Pending;
  };

  const roomStatusConfig: Record<string, { color: string; icon: typeof BedDouble }> = {
    Available: { color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
    Occupied: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Users },
    Cleaning: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Brush },
    Maintenance: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: Wrench },
  };

  const taskStatusConfig: Record<string, string> = {
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  const priorityConfig: Record<string, string> = {
    Low: 'text-white/40',
    Normal: 'text-white/60',
    High: 'text-red-400',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1C1E] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-200" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1C1E]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1A1C1E]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-white/50 transition-colors hover:text-white/80">
              <ArrowLeft size={16} />
              <span className="hidden text-xs sm:inline">Public Site</span>
            </Link>
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <div>
              <h1 className="font-heading text-lg font-medium text-white">Staff Dashboard</h1>
              <p className="text-xs text-white/40">Daily Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-white/60">{user?.email}</p>
              <p className="text-xs text-amber-200/60">Staff</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200/10">
              <UserCircle size={16} className="text-amber-200" />
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-sm border border-white/20 px-4 py-2 text-xs font-medium text-white/70 transition-all hover:border-white/40 hover:text-white"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="sticky top-[65px] z-30 border-b border-white/10 bg-[#1A1C1E]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setActionError('');
                    setActionSuccess('');
                    setSelectedBooking(null);
                  }}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 text-xs font-medium transition-all ${
                    activeTab === item.id
                      ? 'bg-amber-200/10 text-amber-200'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {(actionError || actionSuccess) && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-sm border px-4 py-3 text-sm ${
              actionError
                ? 'border-red-500/20 bg-red-500/10 text-red-400'
                : 'border-green-500/20 bg-green-500/10 text-green-400'
            }`}
          >
            {actionError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {actionError || actionSuccess}
          </div>
        )}

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-heading text-2xl font-light text-white">Operations Overview</h2>
              <p className="text-sm text-white/40">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={CalendarCheck} label="Today's Arrivals" value={todayArrivals.length} color="text-green-400" />
              <StatCard icon={CalendarX} label="Today's Departures" value={todayDepartures.length} color="text-blue-400" />
              <StatCard icon={Users} label="Current Guests" value={currentGuests.length} color="text-amber-200" />
              <StatCard icon={ListTodo} label="Open Tasks" value={allOpenTasks.length} color="text-red-400" />
            </div>

            {/* Today's arrivals preview */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading text-lg font-light text-white">Today's Arrivals</h3>
                <button onClick={() => setActiveTab('arrivals')} className="text-xs text-amber-200/60 hover:text-amber-200">
                  View all
                </button>
              </div>
              {todayArrivals.length === 0 ? (
                <p className="text-sm text-white/40">No arrivals scheduled for today.</p>
              ) : (
                <div className="space-y-2">
                  {todayArrivals.slice(0, 3).map((b) => (
                    <BookingRow key={b.id} booking={b} onClick={() => openBookingDetail(b)} />
                  ))}
                </div>
              )}
            </div>

            {/* My tasks */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading text-lg font-light text-white">My Assigned Tasks</h3>
                <button onClick={() => setActiveTab('tasks')} className="text-xs text-amber-200/60 hover:text-amber-200">
                  View all
                </button>
              </div>
              {myTasks.length === 0 ? (
                <p className="text-sm text-white/40">No tasks assigned to you.</p>
              ) : (
                <div className="space-y-2">
                  {myTasks.slice(0, 5).map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onStatusChange={updateTaskStatus}
                      updating={updatingId === t.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Room status summary */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading text-lg font-light text-white">Room Status Summary</h3>
                <button onClick={() => setActiveTab('rooms')} className="text-xs text-amber-200/60 hover:text-amber-200">
                  Manage rooms
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ROOM_STATUSES.map((status) => {
                  const count = ROOMS.filter((r) => getStatusForRoom(r.slug) === status).length;
                  const cfg = roomStatusConfig[status];
                  const Icon = cfg.icon;
                  return (
                    <div key={status} className={`rounded-sm border p-4 ${cfg.color}`}>
                      <div className="flex items-center gap-2">
                        <Icon size={16} />
                        <span className="text-lg font-medium">{count}</span>
                      </div>
                      <p className="mt-1 text-xs opacity-70">{status}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Arrivals tab */}
        {activeTab === 'arrivals' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-light text-white">Today's Arrivals</h2>
              <p className="text-sm text-white/40">{todayArrivals.length} guest(s) checking in today</p>
            </div>
            {todayArrivals.length === 0 ? (
              <EmptyState icon={CalendarCheck} message="No arrivals scheduled for today." />
            ) : (
              <div className="space-y-2">
                {todayArrivals.map((b) => (
                  <BookingRow key={b.id} booking={b} onClick={() => openBookingDetail(b)} />
                ))}
              </div>
            )}

            <div className="pt-6">
              <h3 className="mb-4 font-heading text-lg font-light text-white">Upcoming Arrivals</h3>
              {upcomingArrivals.length === 0 ? (
                <p className="text-sm text-white/40">No upcoming arrivals.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingArrivals.map((b) => (
                    <BookingRow key={b.id} booking={b} onClick={() => openBookingDetail(b)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Departures tab */}
        {activeTab === 'departures' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-light text-white">Today's Departures</h2>
              <p className="text-sm text-white/40">{todayDepartures.length} guest(s) checking out today</p>
            </div>
            {todayDepartures.length === 0 ? (
              <EmptyState icon={CalendarX} message="No departures scheduled for today." />
            ) : (
              <div className="space-y-2">
                {todayDepartures.map((b) => (
                  <BookingRow key={b.id} booking={b} onClick={() => openBookingDetail(b)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rooms tab */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-light text-white">Room Status</h2>
              <p className="text-sm text-white/40">Update the status of each room</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ROOMS.map((room) => {
                const currentStatus = getStatusForRoom(room.slug);
                const cfg = roomStatusConfig[currentStatus];
                const StatusIcon = cfg.icon;
                return (
                  <div key={room.slug} className="rounded-sm border border-white/10 bg-white/5 p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="font-heading text-base font-medium text-white">{room.name}</h3>
                        <p className="text-xs text-white/40">{room.bedType} - {room.capacity} guests</p>
                      </div>
                      <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${cfg.color}`}>
                        <StatusIcon size={12} />
                        {currentStatus}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ROOM_STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => updateRoomStatus(room.slug, status)}
                          disabled={updatingId === room.slug || currentStatus === status}
                          className={`rounded-sm border px-3 py-2 text-xs font-medium transition-all ${
                            currentStatus === status
                              ? 'border-amber-200/40 bg-amber-200/10 text-amber-200'
                              : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                          } disabled:opacity-40`}
                        >
                          {status === 'Available' && <CheckCircle2 size={12} className="mr-1 inline" />}
                          {status === 'Occupied' && <Users size={12} className="mr-1 inline" />}
                          {status === 'Cleaning' && <Brush size={12} className="mr-1 inline" />}
                          {status === 'Maintenance' && <Wrench size={12} className="mr-1 inline" />}
                          {status}
                        </button>
                      ))}
                    </div>
                    {currentStatus === 'Cleaning' && (
                      <button
                        onClick={() => updateRoomStatus(room.slug, 'Available')}
                        disabled={updatingId === room.slug}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 transition-all hover:bg-green-500/20"
                      >
                        <Sparkle size={14} />
                        Mark as Cleaned / Ready
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Guests tab */}
        {activeTab === 'guests' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-light text-white">Current Guests</h2>
              <p className="text-sm text-white/40">{currentGuests.length} guest(s) currently staying</p>
            </div>
            {currentGuests.length === 0 ? (
              <EmptyState icon={Users} message="No guests currently staying." />
            ) : (
              <div className="space-y-2">
                {currentGuests.map((b) => (
                  <BookingRow key={b.id} booking={b} onClick={() => openBookingDetail(b)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-light text-white">Tasks</h2>
              <p className="text-sm text-white/40">View and update operational tasks</p>
            </div>

            {myTasks.length > 0 && (
              <div>
                <h3 className="mb-3 font-heading text-lg font-light text-white">My Tasks</h3>
                <div className="space-y-2">
                  {myTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onStatusChange={updateTaskStatus} updating={updatingId === t.id} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 font-heading text-lg font-light text-white">All Open Tasks</h3>
              {allOpenTasks.length === 0 ? (
                <EmptyState icon={ListTodo} message="No open tasks." />
              ) : (
                <div className="space-y-2">
                  {allOpenTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onStatusChange={updateTaskStatus} updating={updatingId === t.id} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 font-heading text-lg font-light text-white">Completed Tasks</h3>
              {tasks.filter((t) => t.status === 'Completed').length === 0 ? (
                <p className="text-sm text-white/40">No completed tasks.</p>
              ) : (
                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.status === 'Completed')
                    .map((t) => (
                      <TaskRow key={t.id} task={t} onStatusChange={updateTaskStatus} updating={updatingId === t.id} />
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="mx-auto max-w-md space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-light text-white">Profile</h2>
              <p className="text-sm text-white/40">Your staff account details</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-white/5 p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-200/10">
                  <UserCircle size={28} className="text-amber-200" />
                </div>
                <div>
                  <p className="font-heading text-lg text-white">{user?.email}</p>
                  <p className="text-sm text-amber-200/60">Staff</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-white/40">Role</span>
                  <span className="text-white/80">Staff</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-white/40">Account ID</span>
                  <span className="text-white/60 font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}
      </main>

      {/* Booking detail modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          notes={notes}
          noteText={noteText}
          setNoteText={setNoteText}
          onAddNote={() => addNote(selectedBooking.id)}
          onClose={() => {
            setSelectedBooking(null);
            setNotes([]);
            setNoteText('');
          }}
          onCheckIn={async () => {
            await updateRoomStatus(selectedBooking.room_id, 'Occupied' as RoomStatusValue);
            setActionSuccess(`Checked in ${selectedBooking.guest_name}. Room marked as Occupied.`);
          }}
          onCheckOut={async () => {
            await updateRoomStatus(selectedBooking.room_id, 'Cleaning' as RoomStatusValue);
            setActionSuccess(`Checked out ${selectedBooking.guest_name}. Room marked as Cleaning.`);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof LayoutDashboard; label: string; value: number; color: string }) {
  return (
    <div className="rounded-sm border border-white/10 bg-white/5 p-5">
      <Icon size={20} className={color} />
      <p className="mt-3 font-heading text-3xl font-light text-white">{value}</p>
      <p className="mt-1 text-xs text-white/40">{label}</p>
    </div>
  );
}

function BookingRow({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:border-white/20 hover:bg-white/10"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200/10">
          <Users size={16} className="text-amber-200" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{booking.guest_name}</p>
          <p className="text-xs text-white/40">
            {booking.room_name} - {booking.guests} guest(s) - Ref: {booking.booking_reference}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs text-white/60">In: {booking.check_in}</p>
          <p className="text-xs text-white/60">Out: {booking.check_out}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${statusBadge(booking.booking_status)}`}>
          {booking.booking_status}
        </span>
      </div>
    </button>
  );
}

function TaskRow({
  task,
  onStatusChange,
  updating,
}: {
  task: StaffTask;
  onStatusChange: (id: string, status: string) => void;
  updating: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{task.title}</p>
          <span className={`text-xs ${priorityConfig[task.priority] || 'text-white/40'}`}>
            {task.priority}
          </span>
        </div>
        {task.description && <p className="mt-1 text-xs text-white/40">{task.description}</p>}
        {task.due_date && <p className="mt-1 text-xs text-white/30">Due: {task.due_date}</p>}
      </div>
      <div className="flex items-center gap-2">
        {updating ? (
          <Loader2 size={16} className="animate-spin text-white/40" />
        ) : (
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className={`rounded-sm border px-3 py-1.5 text-xs ${taskStatusConfig[task.status] || 'border-white/10 text-white/60'}`}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[#1A1C1E] text-white">
                {s}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof LayoutDashboard; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-white/10 bg-white/5 py-16">
      <Icon size={32} className="text-white/20" />
      <p className="mt-4 text-sm text-white/40">{message}</p>
    </div>
  );
}

function BookingDetailModal({
  booking,
  notes,
  noteText,
  setNoteText,
  onAddNote,
  onClose,
  onCheckIn,
  onCheckOut,
}: {
  booking: Booking;
  notes: BookingNote[];
  noteText: string;
  setNoteText: (v: string) => void;
  onAddNote: () => void;
  onClose: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-white/10 bg-[#1A1C1E] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-xl font-light text-white">{booking.guest_name}</h3>
            <p className="text-sm text-white/40">Booking {booking.booking_reference}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <XCircle size={20} />
          </button>
        </div>

        {/* Guest info */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <DetailItem label="Room" value={booking.room_name} />
          <DetailItem label="Guests" value={`${booking.guests}`} />
          <DetailItem label="Check-in" value={booking.check_in} />
          <DetailItem label="Check-out" value={booking.check_out} />
          <DetailItem label="Nights" value={`${booking.nights}`} />
          <DetailItem label="Rooms" value={`${booking.number_of_rooms}`} />
          <DetailItem label="Email" value={booking.guest_email} />
          <DetailItem label="Phone" value={booking.guest_phone} />
          <DetailItem label="Country" value={booking.guest_country || 'N/A'} />
          <DetailItem label="Payment Method" value={booking.payment_method} />
          <DetailItem label="Payment Status" value={booking.payment_status} />
          <DetailItem label="Booking Status" value={booking.booking_status} />
        </div>

        {booking.special_requests && (
          <div className="mb-6 rounded-sm border border-white/10 bg-white/5 p-4">
            <p className="mb-1 text-xs text-white/40">Special Requests</p>
            <p className="text-sm text-white/70">{booking.special_requests}</p>
          </div>
        )}

        {/* Check-in / Check-out actions */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={onCheckIn}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400 transition-all hover:bg-green-500/20"
          >
            <CheckCircle size={16} />
            Assist Check-in
          </button>
          <button
            onClick={onCheckOut}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/20"
          >
            <CalendarX size={16} />
            Assist Check-out
          </button>
        </div>

        {/* Notes */}
        <div>
          <h4 className="mb-3 flex items-center gap-2 font-heading text-base font-light text-white">
            <StickyNote size={16} className="text-amber-200" />
            Internal Notes
          </h4>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note..."
              className="flex-1 rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAddNote();
              }}
            />
            <button
              onClick={onAddNote}
              disabled={!noteText.trim()}
              className="flex items-center gap-1.5 rounded-sm bg-amber-200/10 px-4 py-2 text-xs font-medium text-amber-200 transition-all hover:bg-amber-200/20 disabled:opacity-40"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-white/30">No notes yet.</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-sm border border-white/10 bg-white/5 p-3">
                  <p className="text-sm text-white/70">{n.note}</p>
                  <p className="mt-1 text-xs text-white/30">
                    {n.created_by_email} - {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-sm text-white/80">{value}</p>
    </div>
  );
}
