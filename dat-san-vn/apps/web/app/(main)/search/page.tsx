import { Search } from "lucide-react";
import type { FieldSize } from "@dat-san-vn/types";
import { searchVenues } from "@/lib/api";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeading } from "@/components/common/section-heading";
import { Badge } from "@/components/ui/badge";
import { SearchFilters } from "@/components/venue/search-filters";
import { VenueList } from "@/components/venue/venue-list";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    district?: string;
    size?: FieldSize | "ALL";
    priceMax?: string;
    startTime?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const venues = await searchVenues({
    q: resolvedSearchParams.q,
    district: resolvedSearchParams.district,
    size: resolvedSearchParams.size,
    priceMax: resolvedSearchParams.priceMax ? Number(resolvedSearchParams.priceMax) : undefined,
    startTime: resolvedSearchParams.startTime,
  });

  const activeFilters = [
    resolvedSearchParams.q,
    resolvedSearchParams.district,
    resolvedSearchParams.size && resolvedSearchParams.size !== "ALL" ? resolvedSearchParams.size : undefined,
    resolvedSearchParams.startTime,
  ].filter(Boolean) as string[];

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Search"
          title="Tìm sân theo khu vực, loại sân, giá và khung giờ"
          description="Trang này đang dùng `useSearchParams` ở filter sidebar và server-side filtering ở page để giữ URL luôn chia sẻ được."
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="bg-white/80">
            {venues.length} kết quả
          </Badge>
          {activeFilters.length > 0 ? (
            activeFilters.map((filter) => (
              <Badge key={filter} variant="secondary">
                {filter}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">Chưa có bộ lọc, đang hiển thị toàn bộ mock venues</Badge>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside>
            <SearchFilters />
          </aside>

          <section className="grid gap-5">
            <div className="surface-panel flex items-center gap-3 rounded-[28px] border border-white/70 px-5 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-950">Kết quả tìm kiếm</div>
                <p className="text-sm text-slate-600">
                  Query params hiện tại được phản ánh ngay trên server render của trang.
                </p>
              </div>
            </div>

            {venues.length > 0 ? (
              <VenueList venues={venues} />
            ) : (
              <EmptyState
                title="Chưa tìm thấy sân phù hợp"
                description="Thử đổi khu vực, bỏ bớt khung giờ hoặc tăng mức giá tối đa để mở rộng kết quả."
                actionHref="/search"
                actionLabel="Xem lại tất cả sân"
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
