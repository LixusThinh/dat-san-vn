import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { getVenueDetail } from "@/lib/api";
import { BookingSheet } from "@/components/booking/booking-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VenueGallery } from "@/components/venue/venue-gallery";
import { VenueMap } from "@/components/venue/venue-map";
import { formatCurrency } from "@/lib/utils";

type VenueDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VenueDetailPage({ params }: VenueDetailPageProps) {
  const { id } = await params;
  const venue = await getVenueDetail(id);

  if (!venue) {
    notFound();
  }

  const firstField = venue.fields[0];

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{venue.categoryLabel}</Badge>
          <Badge variant="outline">{venue.districtLabel}</Badge>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h1 className="text-4xl font-semibold text-slate-950 sm:text-5xl">{venue.name}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{venue.description}</p>

            <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-700" />
                {venue.address}, {venue.districtLabel}
              </span>
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-current text-amber-400" />
                {venue.rating.toFixed(1)} · {venue.reviewCount} đánh giá
              </span>
            </div>
          </div>

          <Card className="border-white/70">
            <CardContent className="grid gap-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Giá từ</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(venue.minPrice)}</div>
                </div>
                <BookingSheet
                  venueName={venue.name}
                  fieldName={firstField.name}
                  firstSlot={firstField.availableSlots[0]}
                  pricePerSlot={firstField.pricePerSlot}
                />
              </div>
              <div className="grid gap-3 rounded-[28px] bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-emerald-700" />
                  {venue.openingHours}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-700" />
                  {venue.phone}
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  {venue.highlight}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <VenueGallery name={venue.name} images={[venue.heroImage, ...venue.gallery]} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            {venue.fields.map((field) => (
              <Card key={field.id} className="border-white/70">
                <CardContent className="grid gap-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">{field.name}</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        {field.features.join(" · ")}
                      </p>
                    </div>
                    <Badge variant="outline">{formatCurrency(field.pricePerSlot)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {field.availableSlots.map((slot) => (
                      <Badge key={slot} variant="secondary">
                        {slot}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6">
            <VenueMap districtLabel={venue.districtLabel} address={venue.address} />
            <Card className="border-white/70">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-950">Tiện ích</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {venue.amenities.map((item) => (
                    <Badge key={item} variant="outline" className="bg-slate-50">
                      {item}
                    </Badge>
                  ))}
                </div>
                <Button asChild variant="secondary" className="mt-6 w-full">
                  <Link href="/search">Quay lại tìm sân</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
