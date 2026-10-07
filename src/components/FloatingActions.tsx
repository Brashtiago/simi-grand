import { Phone, MessageCircle } from 'lucide-react';
import { useHotelData } from '@/lib/hotel-data';

export default function FloatingActions() {
  const { settings, loading } = useHotelData();
  if (loading || !settings) return null;
  const phoneDigits = settings.phone.replace(/\D/g, '');
  const whatsappLink = `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(settings.whatsapp_message)}`;

  return (
    <div className="fixed bottom-16 right-4 z-40 flex flex-col gap-3 sm:bottom-20 sm:right-6">
      <a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
      >
        <MessageCircle size={24} className="text-white" />
        <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-sm bg-[#1A1C1E] px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          WhatsApp
        </span>
      </a>
      <a
        href={`tel:+91${phoneDigits}`}
        aria-label="Call now"
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1C1E] shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#8B7355] hover:shadow-xl"
      >
        <Phone size={22} className="text-white" />
        <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-sm bg-[#1A1C1E] px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Call Now
        </span>
      </a>
    </div>
  );
}
