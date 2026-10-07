import { Link } from 'react-router-dom';
import { ArrowRight, Users, BedDouble, Maximize, Mountain } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SmartImage from '@/components/SmartImage';
import { useRooms } from '@/lib/rooms';

export default function Rooms() {
  const { rooms: ROOMS } = useRooms();
  return (
    <div>
      <PageHeader
        eyebrow="Accommodation"
        title="Room Categories"
        description="Three categories of boutique comfort, each designed to frame the Himalayas like a viewfinder."
        image={ROOMS[0]?.images?.[0]}
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="space-y-16">
            {ROOMS.map((room, idx) => (
              <div
                key={room.id}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                  idx % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                <div className="relative overflow-hidden rounded-sm">
                  <SmartImage
                    src={room.images[0]}
                    alt={room.name}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute top-4 right-4 rounded-sm bg-amber-200/90 px-4 py-1.5 text-sm font-medium text-[#1A1C1E]">
                    ₹{room.price.toLocaleString('en-IN')} / night
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[#8B7355]">
                    Category {idx + 1} of {ROOMS.length}
                  </p>
                  <h2 className="mt-3 font-heading text-3xl font-medium text-[#1A1C1E] sm:text-4xl">{room.name}</h2>
                  <p className="mt-4 text-base leading-relaxed text-[#4a4a4a]">{room.description}</p>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                      <Users size={18} className="text-[#8B7355]" />
                      {room.capacity} Guests
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                      <BedDouble size={18} className="text-[#8B7355]" />
                      {room.bedType}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                      <Maximize size={18} className="text-[#8B7355]" />
                      {room.roomSize}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                      <Mountain size={18} className="text-[#8B7355]" />
                      {room.viewType}
                    </div>
                  </div>
                  <div className="mt-8 flex gap-4">
                    <Link
                      to={`/rooms/${room.slug}`}
                      className="inline-flex items-center gap-2 rounded-sm bg-[#1A1C1E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#8B7355]"
                    >
                      View Details
                      <ArrowRight size={16} />
                    </Link>
                    <Link
                      to={`/booking?room=${room.slug}`}
                      className="inline-flex items-center gap-2 rounded-sm border border-[#1A1C1E]/20 px-6 py-3 text-sm font-medium text-[#1A1C1E] transition-all duration-300 hover:bg-[#1A1C1E] hover:text-white"
                    >
                      Book This Room
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
