'use client';

import { useEffect, useState } from 'react';
import ReviewForm from './review-form';
import ReviewList from './review-list';

interface VenueReviewsSectionProps {
  venueId: string;
}

export default function VenueReviewsSection({ venueId }: VenueReviewsSectionProps) {
  const [reviews, setReviews] = useState([]);
  const [eligibility, setEligibility] = useState({ canReview: false });

  useEffect(() => {
    // Fetch reviews
    fetch(`/api/reviews/venue/${venueId}`)
      .then(r => r.json())
      .then(data => {
        // Handle both Array and Wrapped Response
        setReviews(Array.isArray(data) ? data : data?.data ?? []);
      })
      .catch(err => console.error('Error fetching reviews:', err));

    // Check eligibility
    fetch(`/api/reviews/eligibility?venueId=${venueId}`)
      .then(r => r.json())
      .then(data => {
        const eligibleBookingIds = data?.data ?? data;
        setEligibility({
          canReview: Array.isArray(eligibleBookingIds) && eligibleBookingIds.length > 0
        });
      })
      .catch(err => console.error('Error checking eligibility:', err));
  }, [venueId]);

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Đánh giá từ khách hàng</h2>
      
      {eligibility.canReview && (
        <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Chia sẻ trải nghiệm của bạn</h3>
          <ReviewForm venueId={venueId} onReviewSubmitted={() => window.location.reload()} />
        </div>
      )}

      <ReviewList reviews={reviews} />
    </div>
  );
}
