import { Star } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useHotelData } from '@/lib/hotel-data';

export default function Reviews() {
  const { reviews } = useHotelData();
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '5.0';

  return (
    <div>
      <PageHeader
        eyebrow="Reviews"
        title="Stories from the mountains"
        description="Genuine reflections from guests who have rested, dined and wandered at Auremonté Simi Grand."
        image="/media/room-photos/luxury-room/2.jpg"
      />

      <section className="bg-[#f5f3ee] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 flex flex-col items-center gap-4 rounded-sm bg-white p-8 shadow-sm sm:flex-row sm:justify-center">
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={20} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <div className="text-center sm:text-left">
              <span className="font-heading text-2xl font-medium text-[#1A1C1E]">{avgRating}</span>
              <span className="ml-2 text-sm text-[#4a4a4a]">· {reviews.length} verified guest reviews</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div key={review.id} className="flex flex-col rounded-sm bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-[#4a4a4a]">
                  "{review.review}"
                </blockquote>
                <div className="mt-6 border-t border-[#1A1C1E]/10 pt-4">
                  <p className="text-sm font-medium text-[#1A1C1E]">{review.author}</p>
                  <p className="mt-0.5 text-xs text-[#8B7355]">
                    {review.country} · {new Date(review.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
