import { MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useHotelData } from '@/lib/hotel-data';

export default function Location() {
  const { settings, locationInfo } = useHotelData();
  if (!settings) return null;
  return (
    <div>
      <PageHeader
        eyebrow="Location"
        title="A quiet retreat above the Beas Valley"
        description="A tranquil base in the Beas Valley, minutes from Manali's landmarks and the great Himalayan trails."
        image="/media/room-photos/luxury-room/3.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="overflow-hidden rounded-sm border border-[#1A1C1E]/10 shadow-lg">
                <iframe
                src={settings.maps_embed}
                  title="Hotel location map"
                  className="aspect-[4/3] w-full"
                  loading="lazy"
                />
              </div>
              <a
                href={settings.maps_link}
                target="_blank"
                rel="noreferrer"
                className="group mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#8B7355] transition-colors hover:text-[#1A1C1E]"
              >
                <MapPin size={16} />
                Open in Google Maps
              </a>
            </div>

            <div>
              <h2 className="font-heading text-3xl font-medium text-[#1A1C1E] sm:text-4xl">Getting Here</h2>
              <p className="mt-4 text-base leading-relaxed text-[#4a4a4a]">
                At an altitude of nearly 5,900 feet, surrounded by cedar and pine, our location balances serenity with access. Mall Road, Hadimba Temple, and the great Himalayan trails are all within minutes — yet the silence at {settings.short_name} feels worlds away.
              </p>

              <h3 className="mt-8 font-heading text-xl font-medium text-[#1A1C1E]">Nearby Locations</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {locationInfo.map((loc) => (
                  <div key={loc.name} className="flex items-center gap-3 rounded-sm border border-[#1A1C1E]/10 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B7355]/10">
                      <MapPin size={18} className="text-[#8B7355]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1A1C1E]">{loc.name}</p>
                      <p className="text-xs text-[#4a4a4a]">{loc.distance} · {loc.travel_time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-sm bg-white p-6 shadow-sm">
                <h3 className="font-heading text-lg font-medium text-[#1A1C1E]">Our Address</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4a4a4a]">{settings.address}</p>
                <p className="mt-1 text-sm text-[#4a4a4a]">{settings.phone_display}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
