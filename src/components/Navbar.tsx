import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ShieldCheck, UserCog, User } from 'lucide-react';
import { useHotelData } from '@/lib/hotel-data';

const STAFF_LINKS = [
  { label: 'Admin', path: '/staff-login?role=admin', icon: ShieldCheck },
  { label: 'Manager', path: '/staff-login?role=manager', icon: UserCog },
  { label: 'Staff', path: '/staff-login?role=staff', icon: User },
];

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Rooms', path: '/rooms' },
  { label: 'Experiences', path: '/experiences' },
  { label: 'Restaurant', path: '/restaurant' },
  { label: 'Amenities', path: '/amenities' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const staffRef = useRef<HTMLLIElement>(null);
  const location = useLocation();
  const { settings } = useHotelData();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (staffRef.current && !staffRef.current.contains(e.target as Node)) {
        setStaffOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !scrolled && !mobileOpen;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isTransparent
            ? 'bg-transparent'
            : 'bg-[#1A1C1E]/95 backdrop-blur-md shadow-lg'
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <Link to="/" className="group flex flex-col leading-none">
            <span
              className={`font-heading text-xl font-medium tracking-wide transition-colors duration-300 sm:text-2xl ${
                isTransparent ? 'text-white' : 'text-white'
              }`}
            >
              {settings?.short_name}
            </span>
            <span
              className={`mt-0.5 text-[10px] uppercase tracking-[0.25em] transition-colors duration-300 sm:text-[11px] ${
                isTransparent ? 'text-white/70' : 'text-amber-200/70'
              }`}
            >
              {settings?.tagline}
            </span>
          </Link>

          <ul className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                      active
                        ? isTransparent
                          ? 'text-white'
                          : 'text-amber-200'
                        : isTransparent
                          ? 'text-white/80 hover:text-white'
                          : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li ref={staffRef} className="relative">
              <button
                onClick={() => setStaffOpen((v) => !v)}
                className={`flex items-center gap-1 text-sm font-medium tracking-wide transition-colors duration-200 ${
                  isTransparent ? 'text-white/80 hover:text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                Staff Login
                <ChevronDown size={14} className={`transition-transform duration-200 ${staffOpen ? 'rotate-180' : ''}`} />
              </button>
              {staffOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-sm border border-white/10 bg-[#22252a] py-1 shadow-xl">
                  {STAFF_LINKS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <Link
                        key={s.label}
                        to={s.path}
                        onClick={() => setStaffOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-amber-200"
                      >
                        <Icon size={15} />
                        {s.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </li>
          </ul>

          <div className="hidden lg:block">
            <Link
              to="/booking"
              className="rounded-sm border border-white/30 px-6 py-2.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:border-amber-200 hover:bg-amber-200/10 hover:text-amber-200"
            >
              Book Now
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#1A1C1E] lg:hidden">
          <div className="flex min-h-full flex-col items-center justify-center gap-5 px-8 py-20">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-heading text-2xl tracking-wide transition-colors ${
                  location.pathname === link.path ? 'text-amber-200' : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/booking"
              className="mt-4 rounded-sm border border-white/30 px-8 py-3 text-sm font-medium tracking-wide text-white transition-all hover:border-amber-200 hover:text-amber-200"
            >
              Book Now
            </Link>

            <div className="mt-8 w-full max-w-xs">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-200/50">Staff Login</p>
              <div className="flex flex-col gap-3">
                {STAFF_LINKS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link
                      key={s.label}
                      to={s.path}
                      className="flex items-center gap-3 rounded-sm border border-white/10 px-4 py-3 text-sm text-white/80 transition-all hover:border-amber-200/40 hover:text-amber-200"
                    >
                      <Icon size={16} />
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
