import { Star } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { fullName?: string };
}

export default function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) {
    return <p className="text-gray-500 italic">Chưa có đánh giá nào.</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b pb-6 last:border-0">
          <div className="flex items-center gap-3">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {review.user?.fullName || 'Người dùng'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
          {review.comment && <p className="mt-2 text-gray-700">{review.comment}</p>}
        </div>
      ))}
    </div>
  );
}
