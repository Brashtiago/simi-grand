import { useState } from 'react';
import { Phone, Mail, MapPin, Instagram, Facebook, MessageCircle, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useHotelData } from '@/lib/hotel-data';

export default function Contact() {
  const { settings, loading } = useHotelData();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setForm({ name: '', email: '', phone: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  const phone = settings?.phone || '';
  const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(settings?.whatsapp_message || '')}`;

  if (loading) return null;
  return (
    <div>
      <PageHeader
        eyebrow="Contact"
        title="The Silent Concierge"
        description="We're here to help with reservations, special requests and curated experiences. Reach us any time."
        image="/media/gallery-photos/1.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Contact Info */}
            <div>
              <h2 className="font-heading text-3xl font-medium text-[#1A1C1E] sm:text-4xl">Get in touch</h2>
              <p className="mt-4 text-base leading-relaxed text-[#4a4a4a]">
                For questions about reservations, special requests, or curated experiences, our team is available around the clock.
              </p>

              <div className="mt-10 space-y-6">
                <a href={`tel:+${phone}`} className="group flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors group-hover:bg-[#8B7355]/20">
                    <Phone size={20} className="text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">Phone</p>
                    <p className="text-sm font-medium text-[#1A1C1E]">{settings?.phone_display}</p>
                  </div>
                </a>

                <a href={`mailto:${settings?.email}`} className="group flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors group-hover:bg-[#8B7355]/20">
                    <Mail size={20} className="text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">Reservations</p>
                    <p className="text-sm font-medium text-[#1A1C1E]">{settings?.email}</p>
                  </div>
                </a>

                <a href={`mailto:${settings?.marketing_email}`} className="group flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors group-hover:bg-[#8B7355]/20">
                    <Mail size={20} className="text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">Marketing</p>
                    <p className="text-sm font-medium text-[#1A1C1E]">{settings?.marketing_email}</p>
                  </div>
                </a>

                <a href={settings?.maps_link} target="_blank" rel="noreferrer" className="group flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors group-hover:bg-[#8B7355]/20">
                    <MapPin size={20} className="text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">Address</p>
                    <p className="text-sm font-medium text-[#1A1C1E] group-hover:text-[#8B7355] transition-colors">{settings?.address}</p>
                  </div>
                </a>

                <a href={whatsappLink} target="_blank" rel="noreferrer" className="group flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors group-hover:bg-[#8B7355]/20">
                    <MessageCircle size={20} className="text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">WhatsApp</p>
                    <p className="text-sm font-medium text-[#1A1C1E]">Chat with us</p>
                  </div>
                </a>

                <a href={settings?.instagram} target="_blank" rel="noreferrer" className="group flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors group-hover:bg-[#8B7355]/20">
                    <Instagram size={20} className="text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">Instagram</p>
                    <p className="text-sm font-medium text-[#1A1C1E]">@auremonte.simigrand.hotel</p>
                  </div>
                </a>

                <a href={settings?.facebook} target="_blank" rel="noreferrer" className="group flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7355]/10 transition-colors group-hover:bg-[#8B7355]/20">
                    <Facebook size={20} className="text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8B7355]">Facebook</p>
                    <p className="text-sm font-medium text-[#1A1C1E]">Auremonté Simigrand</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="rounded-sm bg-white p-8 shadow-lg lg:p-10">
                {submitted ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8B7355]/10">
                      <Send size={28} className="text-[#8B7355]" />
                    </div>
                    <h3 className="mt-6 font-heading text-2xl font-medium text-[#1A1C1E]">We'll be in touch shortly</h3>
                    <p className="mt-2 text-sm text-[#4a4a4a]">Thank you for reaching out. Our team will respond soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="font-heading text-2xl font-medium text-[#1A1C1E]">Send a message</h3>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1.5 w-full border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="+91 ..."
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-[#8B7355]">Message</label>
                      <textarea
                        required
                        rows={4}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="mt-1.5 w-full resize-none border-b border-[#1A1C1E]/20 bg-transparent py-2.5 text-sm text-[#1A1C1E] focus:border-[#8B7355] focus:outline-none"
                        placeholder="How can we help?"
                      />
                    </div>
                    <button
                      type="submit"
                      className="group flex w-full items-center justify-center gap-2 rounded-sm bg-[#1A1C1E] py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#8B7355]"
                    >
                      Send Message
                      <Send size={16} className="transition-transform group-hover:translate-x-1" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
