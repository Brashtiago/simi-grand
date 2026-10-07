import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Users, BedDouble, Maximize, Mountain, Check } from 'lucide-react';
import { useParams, Navigate } from 'react-router-dom';
import { useState } from 'react';
import SmartImage from '@/components/SmartImage';
import { useRooms } from '@/lib/rooms';

export default function RoomDetail() {
  const { slug } = useParams();
  const { rooms: ROOMS } = useRooms();
  const [activeImage, setActiveImage] = useState(0);
  const room = ROOMS.find((r) => r.slug === slug);

  if (!room) return <Navigate to="/rooms" replace />;

  return (
    <div>
      {/* Image Gallery */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <SmartImage
          src={room.images[activeImage]}
          alt={room.name}
          className="h-full w-full object-cover transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1C1E]/40 via-transparent to-[#1A1C1E]/60" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-auto max-w-7xl px-4 pb-10 lg:px-8">
            <Link
              to="/rooms"
              className="group mb-6 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              All Rooms
            </Link>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-200/70">{room.viewType}</p>
            <h1 className="mt-2 font-heading text-4xl font-light text-white sm:text-5xl lg:text-6xl">{room.name}</h1>
          </div>
        </div>
      </section>

      {/* Thumbnails */}
      <div className="bg-[#1A1C1E] py-4">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 pb-2 lg:px-8" style={{ scrollbarWidth: 'thin' }}>
          {room.images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(idx)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-sm transition-all duration-300 sm:h-20 sm:w-32 ${
                idx === activeImage ? 'ring-2 ring-amber-200' : 'opacity-50 hover:opacity-80'
              }`}
            >
              <SmartImage src={img} alt={`${room.name} ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <section className="bg-[#f5f3ee] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
            <div className="lg:col-span-2">
              <h2 className="font-heading text-2xl font-medium text-[#1A1C1E] sm:text-3xl">About this room</h2>
              <p className="mt-4 text-base leading-relaxed text-[#4a4a4a]">{room.description}</p>
              <p className="mt-4 text-base leading-relaxed text-[#4a4a4a]">
                Every room frames the Himalayas like a photograph. Waking here is an act of looking — through morning mist to snow and pine.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div className="border-l-2 border-[#8B7355] pl-4">
                  <Users size={20} className="text-[#8B7355]" />
                  <p className="mt-2 text-xs uppercase tracking-wide text-[#8B7355]">Capacity</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{room.capacity} Guests</p>
                </div>
                <div className="border-l-2 border-[#8B7355] pl-4">
                  <BedDouble size={20} className="text-[#8B7355]" />
                  <p className="mt-2 text-xs uppercase tracking-wide text-[#8B7355]">Bed Type</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{room.bedType}</p>
                </div>
                <div className="border-l-2 border-[#8B7355] pl-4">
                  <Maximize size={20} className="text-[#8B7355]" />
                  <p className="mt-2 text-xs uppercase tracking-wide text-[#8B7355]">Room Size</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{room.roomSize}</p>
                </div>
                <div className="border-l-2 border-[#8B7355] pl-4">
                  <Mountain size={20} className="text-[#8B7355]" />
                  <p className="mt-2 text-xs uppercase tracking-wide text-[#8B7355]">View</p>
                  <p className="text-sm font-medium text-[#1A1C1E]">{room.viewType}</p>
                </div>
              </div>

              <h3 className="mt-12 font-heading text-xl font-medium text-[#1A1C1E]">Amenities</h3>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {room.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B7355]/10">
                      <Check size={12} className="text-[#8B7355]" />
                    </div>
                    {amenity}
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-sm bg-white p-6 shadow-lg">
                <div className="flex items-baseline justify-between">
                  <span className="font-heading text-3xl font-medium text-[#1A1C1E]">
                    ₹{room.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-[#4a4a4a]">/ night</span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[#4a4a4a]">
                  <p>Weekend: ₹{room.weekendPrice.toLocaleString('en-IN')} / night</p>
                  <p>Seasonal: ₹{room.seasonalPrice.toLocaleString('en-IN')} / night</p>
                </div>
                <div className="mt-6 border-t border-[#1A1C1E]/10 pt-6">
                  <p className="text-sm text-[#4a4a4a]">{room.totalRooms} rooms available</p>
                  <p className="mt-2 text-xs text-[#4a4a4a]">
                    Free cancellation up to 48 hours before check-in
                  </p>
                </div>
                <Link
                  to={`/booking?room=${room.slug}`}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-[#1A1C1E] py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#8B7355]"
                >
                  Book This Room
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/rooms"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-[#1A1C1E]/20 py-3 text-sm font-medium text-[#1A1C1E] transition-all duration-300 hover:bg-[#1A1C1E]/5"
                >
                  Select Room
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
