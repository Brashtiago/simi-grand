import { MapPin, ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SmartImage from '@/components/SmartImage';
import { useHotelData } from '@/lib/hotel-data';

export default function Experiences() {
  const { attractions, loading } = useHotelData();
  if (loading) return null;
  return (
    <div>
      <PageHeader
        eyebrow="Experiences"
        title="Beyond the threshold of Manali"
        description="Ancient temples, hidden waterfalls, alpine valleys and the warm culture of the Kullu region — all within reach of Auremonté Simi Grand."
        image="/media/gallery-photos/4.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {attractions.map((attraction) => (
              <div key={attraction.id} className="group overflow-hidden rounded-sm bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
                <div className="relative aspect-[3/2] overflow-hidden">
                  <SmartImage
                    src={attraction.image}
                    alt={attraction.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4 rounded-sm bg-white/90 px-3 py-1 text-xs font-medium text-[#1A1C1E]">
                    {attraction.distance} · {attraction.travel_time}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-xl font-medium text-[#1A1C1E]">{attraction.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4a4a4a]">{attraction.description}</p>
                  <a
                    href={attraction.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#8B7355] transition-colors hover:text-[#1A1C1E]"
                  >
                    <MapPin size={14} />
                    View on Map
                    <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
