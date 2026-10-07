import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SmartImage from '@/components/SmartImage';
import { useHotelData } from '@/lib/hotel-data';
import { supabase, localizeMediaUrl } from '@/lib/supabase';

interface GalleryPhoto {
  photo_url: string;
  label: string | null;
}

export default function Gallery() {
  const { galleryImages } = useHotelData();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ src: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gallery_photos')
        .select('photo_url, label')
        .order('sort_order', { ascending: true });

      if (data && data.length > 0) {
        setPhotos(
          (data as GalleryPhoto[]).map((p) => ({
            src: localizeMediaUrl(p.photo_url),
            label: p.label || 'Gallery',
          }))
        );
      } else if (galleryImages.length > 0) {
        setPhotos(galleryImages.map((g) => ({ src: g.src, label: g.label || 'Gallery' })));
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Gallery"
        title="Through the Auremonté Simi Grand lens"
        description="A visual passage through our rooms, dining, views and the surrounding Himalayan landscape."
        image="/media/room-photos/luxury-room/2.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setLightbox(img.src)}
                className={`group relative overflow-hidden rounded-sm ${
                  idx % 5 === 0 ? 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2' : ''
                }`}
              >
                <SmartImage
                  src={img.src}
                  alt={img.label}
                  className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                    idx % 5 === 0 ? 'aspect-square sm:aspect-square' : 'aspect-[4/3]'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1C1E]/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <p className="absolute bottom-4 left-4 text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {img.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1C1E]/95 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 transition-colors hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X size={32} />
          </button>
          <SmartImage
            src={lightbox}
            alt="Gallery"
            className="max-h-[90vh] max-w-[90vw] rounded-sm object-contain"
          />
        </div>
      )}
    </div>
  );
}
