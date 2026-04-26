"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

type Review = {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
};

export function VenueReviews({ venueId }: { venueId: string }) {
  const { getToken, isSignedIn } = useAuth();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibleBookings, setEligibleBookings] = useState<string[]>([]);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/venue/${venueId}?limit=10`);
      if (res.ok) {
        const json = await res.json();
        setReviews(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibility = async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/reviews/eligibility?venueId=${venueId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const bookings = await res.json();
        setEligibleBookings(bookings || []);
        if (bookings && bookings.length > 0) {
          setSelectedBooking(bookings[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchEligibility();
  }, [venueId, isSignedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) {
      setErrorMsg("Vui lòng chọn booking để đánh giá");
      return;
    }
    
    setSubmitting(true);
    setErrorMsg("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId,
          bookingId: selectedBooking,
          rating,
          comment,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Lỗi khi gửi đánh giá");
      }

      // Reset form and reload
      setComment("");
      setRating(5);
      fetchReviews();
      fetchEligibility();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8">
      {/* Review Form - Only show if eligible */}
      {isSignedIn && eligibleBookings.length > 0 && (
        <Card className="border-white/70 shadow-sm border bg-emerald-50/50">
          <CardContent className="p-6">
            <h3 className="mb-4 text-xl font-semibold text-slate-900">Viết đánh giá của bạn</h3>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Booking của bạn</label>
                <select
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={selectedBooking}
                  onChange={(e) => setSelectedBooking(e.target.value)}
                >
                  {eligibleBookings.map((id) => (
                    <option key={id} value={id}>
                      Mã booking: {id.split("-")[0]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Điểm đánh giá ({rating} sao)</label>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Trải nghiệm của bạn (tùy chọn)</label>
                <Textarea
                  className="mt-1"
                  placeholder="Chia sẻ về sân bóng, dịch vụ..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>

              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gửi đánh giá
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Review List */}
      <div>
        <h3 className="mb-6 text-2xl font-semibold text-slate-900">Đánh giá từ người chơi</h3>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            <MessageSquare className="mb-3 h-8 w-8 text-slate-300" />
            <p>Chưa có đánh giá nào cho sân này.<br />(Bạn cần phải đá xong 1 trận mới có thể đánh giá)</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id} className="border-white/70 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                        {review.user?.avatarUrl ? (
                          <img src={review.user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-emerald-100 font-semibold text-emerald-800">
                            {review.user?.fullName?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{review.user?.fullName || "Người dùng ẩn"}</div>
                        <div className="text-xs text-slate-500">
                          {format(new Date(review.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">{review.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
