import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Facebook, ArrowUpRight } from 'lucide-react';
import { useHotelData } from '@/lib/hotel-data';

export default function Footer() {
  const { settings, loading } = useHotelData();
  if (loading || !settings) return null;
  return (
    <footer className="bg-[#1A1C1E] text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <h3 className="font-heading text-2xl font-medium text-white">{settings.short_name}</h3>
            <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-amber-200/60">{settings.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed">
              A Himalayan modernism sanctuary in Shuru, Manali — where raw mountain grandeur meets warm cedar-wood hospitality.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-lg font-medium text-white">Explore</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/rooms" className="transition-colors hover:text-amber-200">Rooms</Link></li>
              <li><Link to="/experiences" className="transition-colors hover:text-amber-200">Experiences</Link></li>
              <li><Link to="/restaurant" className="transition-colors hover:text-amber-200">Restaurant</Link></li>
              <li><Link to="/amenities" className="transition-colors hover:text-amber-200">Amenities</Link></li>
              <li><Link to="/gallery" className="transition-colors hover:text-amber-200">Gallery</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-amber-200">About</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-lg font-medium text-white">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href={settings.maps_link} target="_blank" rel="noreferrer" className="flex items-start gap-3 transition-colors hover:text-amber-200">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-amber-200/60" />
                  <span>{settings.address}</span>
                </a>
              </li>
              <li>
                <a href={`tel:+${settings.phone}`} className="flex items-center gap-3 transition-colors hover:text-amber-200">
                  <Phone size={16} className="shrink-0 text-amber-200/60" />
                  {settings.phone_display}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="flex items-center gap-3 transition-colors hover:text-amber-200">
                  <Mail size={16} className="shrink-0 text-amber-200/60" />
                  {settings.email}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.marketing_email}`} className="flex items-center gap-3 transition-colors hover:text-amber-200">
                  <Mail size={16} className="shrink-0 text-amber-200/60" />
                  {settings.marketing_email}
                </a>
              </li>
              <li>
                <a href={settings.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-3 transition-colors hover:text-amber-200">
                  <Instagram size={16} className="shrink-0 text-amber-200/60" />
                  Instagram
                </a>
              </li>
              <li>
                <a href={settings.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-3 transition-colors hover:text-amber-200">
                  <Facebook size={16} className="shrink-0 text-amber-200/60" />
                  Facebook
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-lg font-medium text-white">Reserve</h4>
            <p className="mt-4 text-sm leading-relaxed">
              Secure your room instantly with online payment.
            </p>
            <Link
              to="/booking"
              className="mt-4 inline-flex items-center gap-2 rounded-sm border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-amber-200 hover:text-amber-200"
            >
              Book Your Stay
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.name}. All rights reserved.</p>
          <p>Crafted in the Himalayas · Manali, Himachal Pradesh</p>
        </div>
      </div>
    </footer>
  );
}
