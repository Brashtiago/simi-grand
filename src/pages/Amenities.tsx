import type { LucideIcon } from 'lucide-react';
import {
  Wifi,
  Car,
  ConciergeBell,
  Trees,
  Utensils,
  UtensilsCrossed,
  Flame,
  Map,
  Shirt,
  Zap,
  ShieldCheck,
  Mountain,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useHotelData } from '@/lib/hotel-data';

const ICON_MAP: Record<string, LucideIcon> = {
  wifi: Wifi,
  car: Car,
  'concierge-bell': ConciergeBell,
  trees: Trees,
  utensils: Utensils,
  'room-service': UtensilsCrossed,
  flame: Flame,
  map: Map,
  shirt: Shirt,
  zap: Zap,
  'shield-check': ShieldCheck,
  mountain: Mountain,
};

export default function Amenities() {
  const { amenities, loading } = useHotelData();
  if (loading) return null;
  return (
    <div>
      <PageHeader
        eyebrow="Amenities"
        title="Considered comforts, mountain hospitality"
        description="Everything you need for a restful, elevated stay in the heart of the Himalayas."
        image="/media/gallery-photos/2.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => {
              const Icon = ICON_MAP[amenity.icon] ?? Wifi;
              return (
                <div
                  key={amenity.id}
                  className="group rounded-sm bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors duration-300 group-hover:bg-[#8B7355]/20">
                    <Icon size={24} className="text-[#8B7355]" />
                  </div>
                  <h3 className="mt-5 font-heading text-xl font-medium text-[#1A1C1E]">{amenity.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4a4a4a]">{amenity.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-16 rounded-sm bg-[#1A1C1E] p-10 text-center lg:p-16">
            <h3 className="font-heading text-2xl font-light text-white sm:text-3xl">
              Beyond the rooms, our landscaped lawn and open terraces invite you to linger
            </h3>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              Morning tea with a view, an evening bonfire under a ceiling of stars, or simply the quiet of the mountains.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
