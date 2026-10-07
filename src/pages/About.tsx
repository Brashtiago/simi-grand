import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SmartImage from '@/components/SmartImage';
import { useHotelData } from '@/lib/hotel-data';

export default function About() {
  const { settings, loading } = useHotelData();
  if (loading || !settings) return null;
  return (
    <div>
      <PageHeader
        eyebrow="About"
        title={`The story of ${settings.short_name}`}
        description="A Himalayan modernism sanctuary in Shuru, where raw mountain grandeur meets warm cedar-wood hospitality."
        image="/media/gallery-photos/1.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <div className="space-y-5 text-base leading-relaxed text-[#4a4a4a]">
                <p>
                  Nestled in the village of Shuru, just beyond Manali's bustle, {settings.name} is a sanctuary shaped by its surroundings. We celebrate the raw, jagged grandeur of the Himalayas through a lens of mist-inspired palettes, architectural typography, and warm cedar-wood interiors.
                </p>
                <p>
                  Architecture and interiors inspired by the staggered elevations of the range — mist palettes, cedar warmth, and a silence that lets the mountains speak.
                </p>
                <p>
                  Hospitality that is sophisticated and understated, anticipating your needs without intrusion — like cold mountain air meeting a warm cedar fire.
                </p>
                <p>
                  At an altitude of nearly 5,900 feet, surrounded by cedar and pine, our location balances serenity with access. Mall Road, Hadimba Temple, and the great Himalayan trails are all within minutes — yet the silence at {settings.short_name} feels worlds away.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="overflow-hidden rounded-sm">
                <SmartImage src="/media/gallery-photos/2.jpg" alt="Garden lawn" className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105" />
              </div>
              <div className="overflow-hidden rounded-sm">
                <SmartImage src="/media/gallery-photos/3.jpg" alt="Mountain view" className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105" />
              </div>
            </div>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <p className="font-heading text-5xl font-light text-[#8B7355]">5,900</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#4a4a4a]">Feet Above Sea Level</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-5xl font-light text-[#8B7355]">12</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#4a4a4a]">Boutique Rooms</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-5xl font-light text-[#8B7355]">5★</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#4a4a4a]">Guest Rating</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link
              to="/booking"
              className="group inline-flex items-center gap-2 rounded-sm bg-[#1A1C1E] px-8 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#8B7355]"
            >
              Begin your mountain story
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
