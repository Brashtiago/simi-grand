import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { Room } from '@/lib/rooms';
import { logActivity } from '@/lib/activity';

interface Actor {
  id: string;
  email: string;
  role: string;
}

interface RoomEditorProps {
  room: Room | undefined;
  roomSlug: string;
  actor: Actor | null;
  onSaved: () => void;
}

export default function RoomEditor({ room, roomSlug, actor, onSaved }: RoomEditorProps) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', weekendPrice: '', seasonalPrice: '',
    capacity: '', bedType: '', roomSize: '', viewType: '', amenities: '', totalRooms: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (room) {
      setForm({
        name: room.name,
        description: room.description,
        price: String(room.price),
        weekendPrice: String(room.weekendPrice),
        seasonalPrice: String(room.seasonalPrice),
        capacity: String(room.capacity),
        bedType: room.bedType,
        roomSize: room.roomSize,
        viewType: room.viewType,
        amenities: room.amenities.join(', '),
        totalRooms: String(room.totalRooms),
      });
    }
  }, [room, roomSlug]);

  const handleSave = async () => {
    if (!form.name || !form.description || !form.price) {
      setError('Name, description, and default price are required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        weekend_price: parseFloat(form.weekendPrice || '0'),
        seasonal_price: parseFloat(form.seasonalPrice || '0'),
        capacity: parseInt(form.capacity || '2'),
        bed_type: form.bedType,
        room_size: form.roomSize,
        view_type: form.viewType,
        amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
        total_rooms: parseInt(form.totalRooms || '1'),
      })
      .eq('slug', roomSlug);

    if (updateError) {
      setError(`Failed to save: ${updateError.message}`);
    } else {
      await logActivity(
        actor,
        'room_updated',
        'room',
        `Updated details for ${form.name} (${roomSlug})`,
        roomSlug,
        { name: form.name, price: form.price, weekend_price: form.weekendPrice, seasonal_price: form.seasonalPrice, capacity: form.capacity, total_rooms: form.totalRooms },
      );
      setSuccess('Room details updated successfully.');
      onSaved();
    }
    setSaving(false);
  };

  if (!room) {
    return <div className="rounded-sm border border-white/10 bg-[#22252a] p-12 text-center text-sm text-white/40">Select a room to edit.</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-sm bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-sm bg-green-500/10 p-3 text-sm text-green-400">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
        <h4 className="font-heading text-base font-medium text-white">Basic Information</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/40">Room Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/40">Total Rooms (inventory)</label>
            <input
              type="number"
              min="0"
              value={form.totalRooms}
              onChange={(e) => setForm({ ...form, totalRooms: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs text-white/40">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
        <h4 className="font-heading text-base font-medium text-white">Pricing (per night)</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-white/40">Default Price (₹)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/40">Weekend Price (₹)</label>
            <input
              type="number"
              min="0"
              value={form.weekendPrice}
              onChange={(e) => setForm({ ...form, weekendPrice: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/40">Seasonal Price (₹)</label>
            <input
              type="number"
              min="0"
              value={form.seasonalPrice}
              onChange={(e) => setForm({ ...form, seasonalPrice: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
        <h4 className="font-heading text-base font-medium text-white">Room Details</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/40">Capacity (guests)</label>
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/40">Bed Type</label>
            <input
              type="text"
              value={form.bedType}
              onChange={(e) => setForm({ ...form, bedType: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/40">Room Size</label>
            <input
              type="text"
              value={form.roomSize}
              onChange={(e) => setForm({ ...form, roomSize: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/40">View Type</label>
            <input
              type="text"
              value={form.viewType}
              onChange={(e) => setForm({ ...form, viewType: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs text-white/40">Amenities (comma-separated)</label>
          <input
            type="text"
            value={form.amenities}
            onChange={(e) => setForm({ ...form, amenities: e.target.value })}
            className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2 text-sm text-white focus:border-amber-200/40 focus:outline-none"
          />
          <p className="mt-1 text-xs text-white/30">e.g. High-Speed Wi-Fi, Mountain View, Mini Bar</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-sm bg-amber-200/10 px-6 py-3 text-sm font-medium text-amber-200 transition-all hover:bg-amber-200/20 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save size={16} />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}
