import PageHeader from '@/components/PageHeader';
import SmartImage from '@/components/SmartImage';
import { useHotelData } from '@/lib/hotel-data';

export default function Restaurant() {
  const { menuItems } = useHotelData();
  return (
    <div>
      <PageHeader
        eyebrow="Restaurant"
        title="Dining beneath the peaks"
        description="A dining room where local Himachali flavours meet considered, candlelit design."
        image="/media/gallery-photos/10.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-[#8B7355]">A taste of the mountains</p>
            <h2 className="mt-3 font-heading text-3xl font-medium text-[#1A1C1E] sm:text-4xl">
              Cuisine rooted in the valley
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#4a4a4a]">
              Our restaurant celebrates the produce and traditions of the Kullu valley — river trout, orchard fruit, cedar and pine. Each plate is served against a backdrop of mist and mountain, by candlelight and the glow of an open fire.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {menuItems.map((item) => (
              <div key={item.id} className="group flex gap-4 overflow-hidden rounded-sm bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-lg sm:gap-6 sm:p-5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm sm:h-28 sm:w-28">
                  <SmartImage
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-heading text-lg font-medium text-[#1A1C1E] sm:text-xl">{item.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4a4a4a] sm:mt-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-12 text-center text-sm italic text-[#8B7355]">
            Menu is seasonal and subject to availability · A plated dish with mountain views
          </p>
        </div>
      </section>
    </div>
  );
}
