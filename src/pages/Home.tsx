import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import SectionHeading from '@/components/SectionHeading';
import SmartImage from '@/components/SmartImage';
import { useHotelData } from '@/lib/hotel-data';
import { useRooms } from '@/lib/rooms';

export default function Home() {
  const { rooms: ROOMS } = useRooms();
  const { settings, attractions, reviews, locationInfo } = useHotelData();
  const [activeReview, setActiveReview] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % Math.max(reviews.length, 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const nextReview = () => setActiveReview((prev) => (prev + 1) % Math.max(reviews.length, 1));
  const prevReview = () => setActiveReview((prev) => (prev - 1 + Math.max(reviews.length, 1)) % Math.max(reviews.length, 1));

  return (
    <div>
      {/* Hero */}
      <section className="relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/media/gallery-photos/1.jpg"
            className="h-full w-full object-cover"
          >
            <source
              src={settings?.hero_video || '/media/hero/hero.mp4'}
              type="video/mp4"
            />
            <img
              src="/media/gallery-photos/1.jpg"
              alt="Himalayan panorama"
              className="h-full w-full object-cover"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1C1E]/50 via-[#1A1C1E]/30 to-[#1A1C1E]/70" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <p className="animate-fade-in text-xs uppercase tracking-[0.35em] text-white/80">
            {settings?.subtitle || 'Boutique Hotel · Manali'}
          </p>
          <h1 className="animate-fade-up mt-6 font-heading text-4xl font-light leading-tight text-white sm:text-5xl lg:text-7xl">
            Where the Himalayas Meet
            <br />
            Quiet Luxury
          </h1>
          <p className="animate-fade-up mt-6 max-w-xl mx-auto text-sm leading-relaxed text-white/80 sm:text-lg">
            A boutique sanctuary in Shuru, Manali — where quiet luxury meets the grandeur of the Himalayas.
          </p>
          <div className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <Link
              to="/booking"
              className="group inline-flex items-center gap-2 rounded-sm bg-amber-200/90 px-8 py-3.5 text-sm font-medium tracking-wide text-[#1A1C1E] transition-all duration-300 hover:bg-amber-200"
            >
              Begin your mountain story
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/rooms"
              className="inline-flex items-center gap-2 rounded-sm border border-white/40 px-8 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:border-white hover:bg-white/10"
            >
              Explore Rooms
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/40 p-1.5">
            <div className="h-2 w-1 animate-bounce rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      {/* Intro / Story */}
      <section className="bg-[#f5f3ee] py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8B7355]">In Shuru, above the noise of Manali</p>
              <h2 className="mt-4 font-heading text-3xl font-medium leading-tight text-[#1A1C1E] sm:text-4xl lg:text-5xl">
                The story of {settings?.short_name || 'Auremonté Simi Grand'}
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-[#4a4a4a]">
                <p>
                  Nestled in the village of Shuru, just beyond Manali's bustle, {settings?.name || 'Auremonté Simi Grand Hotel'} is a sanctuary shaped by its surroundings. We celebrate the raw, jagged grandeur of the Himalayas through a lens of mist-inspired palettes, architectural typography, and warm cedar-wood interiors.
                </p>
                <p>
                  Architecture and interiors inspired by the staggered elevations of the range — mist palettes, cedar warmth, and a silence that lets the mountains speak.
                </p>
              </div>
              <Link
                to="/about"
                className="group mt-8 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-[#1A1C1E] transition-colors hover:text-[#8B7355]"
              >
                Discover {settings?.short_name || 'Auremonté Simi Grand'}
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-sm">
                <SmartImage
                  src="/media/gallery-photos/7.jpg"
                  alt="Garden lawn with Himalayan backdrop"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 hidden w-48 overflow-hidden rounded-sm border-4 border-[#f5f3ee] shadow-xl sm:block">
                <SmartImage
                  src="/media/room-photos/luxury-room/2.jpg"
                  alt="Himalayan mountain range"
                  className="aspect-square w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Room Categories */}
      <section className="bg-[#1A1C1E] py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <SectionHeading
            light
            eyebrow="Room Categories"
            title="A Viewfinder on the Peaks"
            description="Three categories of boutique comfort, each designed to frame the Himalayas like a viewfinder."
          />
          <div className="mt-10 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 sm:mt-16">
            {ROOMS.map((room) => (
              <Link
                key={room.id}
                to={`/rooms/${room.slug}`}
                className="group overflow-hidden rounded-sm bg-[#22252a] transition-all duration-500 hover:bg-[#2a2d33]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SmartImage
                    src={room.images[0]}
                    alt={room.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1C1E]/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="rounded-sm bg-amber-200/90 px-3 py-1 text-xs font-medium text-[#1A1C1E]">
                      ₹{room.price.toLocaleString('en-IN')} / night
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-2xl font-medium text-white">{room.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{room.roomSize} · {room.bedType} · {room.capacity} Guests</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/70 line-clamp-2">{room.description}</p>
                  <span className="group mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-200 transition-colors">
                    View Details
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/rooms"
              className="inline-flex items-center gap-2 rounded-sm border border-white/30 px-8 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:border-amber-200 hover:text-amber-200"
            >
              All Rooms
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Dining */}
      <section className="bg-[#f5f3ee] py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="order-2 lg:order-1">
              <SmartImage
                src="/media/gallery-photos/10.jpg"
                alt="Dining room interior"
                className="aspect-[4/3] w-full rounded-sm object-cover"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs uppercase tracking-[0.25em] text-[#8B7355]">Dining beneath the peaks</p>
              <h2 className="mt-4 font-heading text-3xl font-medium leading-tight text-[#1A1C1E] sm:text-4xl lg:text-5xl">
                Cuisine rooted in the valley
              </h2>
              <p className="mt-6 text-base leading-relaxed text-[#4a4a4a]">
                Our restaurant celebrates the produce and traditions of the Kullu valley — river trout, orchard fruit, cedar and pine. Each plate is served against a backdrop of mist and mountain, by candlelight and the glow of an open fire.
              </p>
              <Link
                to="/restaurant"
                className="group mt-8 inline-flex items-center gap-2 rounded-sm bg-[#1A1C1E] px-7 py-3 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#8B7355]"
              >
                Explore the Restaurant
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Experiences */}
      <section className="bg-[#f5f3ee] py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <SectionHeading
            eyebrow="Experiences"
            title="Beyond the threshold of Manali"
            description="Ancient temples, hidden waterfalls, alpine valleys and the warm culture of the Kullu region — all within reach of Auremonté Simi Grand."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:mt-16">
            {attractions.slice(0, 3).map((attraction) => (
              <div key={attraction.id} className="group overflow-hidden rounded-sm bg-white shadow-sm">
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
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/experiences"
              className="inline-flex items-center gap-2 rounded-sm border border-[#1A1C1E]/20 px-8 py-3.5 text-sm font-medium tracking-wide text-[#1A1C1E] transition-all duration-300 hover:bg-[#1A1C1E] hover:text-white"
            >
              All Experiences
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-[#1A1C1E] py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <SectionHeading
            light
            eyebrow="Guest Reflections"
            title="Stories from the mountains"
            description="Genuine reflections from guests who have rested, dined and wandered at Auremonté Simi Grand."
          />
          <div className="mt-10 sm:mt-16">
            <div className="relative min-h-[200px]">
              {reviews.map((review, idx) => (
                <div
                  key={review.id}
                  className={`absolute inset-0 transition-all duration-700 ${
                    idx === activeReview ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  <div className="flex justify-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className={i < review.rating ? 'fill-amber-200 text-amber-200' : 'text-white/20'}
                      />
                    ))}
                  </div>
                  <blockquote className="mt-6 text-center font-heading text-xl font-light italic leading-relaxed text-white/90 sm:text-2xl">
                    "{review.review}"
                  </blockquote>
                  <p className="mt-6 text-center text-sm uppercase tracking-[0.2em] text-amber-200/70">
                    {review.author} · {review.country}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button onClick={prevReview} className="text-white/50 transition-colors hover:text-white" aria-label="Previous review">
                <ChevronLeft size={24} />
              </button>
              <div className="flex gap-2">
                {reviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveReview(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === activeReview ? 'w-8 bg-amber-200' : 'w-1.5 bg-white/30'
                    }`}
                    aria-label={`Go to review ${idx + 1}`}
                  />
                ))}
              </div>
              <button onClick={nextReview} className="text-white/50 transition-colors hover:text-white" aria-label="Next review">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="bg-[#f5f3ee] py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <SectionHeading
            eyebrow="The Location"
            title="A quiet retreat above the Beas Valley"
            description="A tranquil base in the Beas Valley, minutes from Manali's landmarks and the great Himalayan trails."
          />
          <div className="mt-10 grid gap-10 sm:gap-12 lg:grid-cols-2 sm:mt-16">
            <div>
              <div className="overflow-hidden rounded-sm border border-[#1A1C1E]/10">
                <iframe
                  src={settings?.maps_embed || ''}
                  title="Hotel location map"
                  className="aspect-[4/3] w-full"
                  loading="lazy"
                />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-2xl font-medium text-[#1A1C1E]">Getting Here</h3>
              <p className="mt-4 text-base leading-relaxed text-[#4a4a4a]">
                At an altitude of nearly 5,900 feet, surrounded by cedar and pine, our location balances serenity with access. Mall Road, Hadimba Temple, and the great Himalayan trails are all within minutes — yet the silence at {settings?.short_name || 'Auremonté Simi Grand'} feels worlds away.
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
              <Link
                to="/location"
                className="group mt-8 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-[#1A1C1E] transition-colors hover:text-[#8B7355]"
              >
                View Full Location
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0">
          <SmartImage src="/media/room-photos/luxury-room/2.jpg" alt="Himalayan mountain range" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#1A1C1E]/80" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <h2 className="font-heading text-3xl font-light text-white sm:text-4xl lg:text-5xl">
            Begin your mountain story
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
            Every room frames the Himalayas like a photograph. Waking here is an act of looking — through morning mist to snow and pine.
          </p>
          <Link
            to="/booking"
            className="mt-8 inline-flex items-center gap-2 rounded-sm bg-amber-200 px-8 py-3.5 text-sm font-medium tracking-wide text-[#1A1C1E] transition-all duration-300 hover:bg-amber-100"
          >
            Book Your Stay
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
