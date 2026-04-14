import Image from "next/image";
import Link from "next/link";
import type { FieldSize, VenueSummary } from "@dat-san-vn/types";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { venueDetails } from "@/lib/mock-data";

const sizeLabel: Record<FieldSize, string> = {
  FIELD_5: "Sân 5",
  FIELD_7: "Sân 7",
  FIELD_11: "Sân 11",
  OTHER: "Khác",
};

export function VenueCard({
  venue,
  compact = false,
}: Readonly<{
  venue: VenueSummary;
  compact?: boolean;
}>) {
  const detail = venueDetails.find((item) => item.id === venue.id);

  return (
    <Card className="group overflow-hidden rounded-[32px] border border-white/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(16,34,22,0.14)]">
      <div className={compact ? "grid gap-4 p-4 sm:grid-cols-[180px_1fr]" : ""}>
        <div className={compact ? "relative overflow-hidden rounded-[24px] min-h-[180px]" : "relative h-56 overflow-hidden"}>
          <Image
            src={
              detail?.heroImage ??
              venue.images[0] ??
              "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80"
            }
            alt={venue.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes={compact ? "(max-width: 768px) 100vw, 180px" : "(max-width: 768px) 100vw, 33vw"}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/70 to-transparent px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-current text-amber-300" />
              <span>{detail?.rating.toFixed(1) ?? "4.7"}</span>
            </div>
            <Badge className="bg-white/14 text-white hover:bg-white/14">{detail?.categoryLabel ?? "Nổi bật"}</Badge>
          </div>
        </div>

        <CardContent className={compact ? "p-0 pt-1" : "p-5"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">{venue.name}</h3>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-emerald-700" />
                {venue.address}, {venue.district}
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-700" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {venue.fields.slice(0, 3).map((field) => (
              <Badge key={field.id} variant="outline" className="bg-slate-50">
                {sizeLabel[field.size]}
              </Badge>
            ))}
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Giá từ</div>
              <div className="text-lg font-semibold text-slate-950">
                {formatCurrency(detail?.minPrice ?? 450000)}
              </div>
            </div>
            <Button asChild>
              <Link href={`/venues/${venue.id}`}>Xem chi tiết</Link>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
