import { MapPinned } from "lucide-react";

export function VenueMap({
  districtLabel,
  address,
}: Readonly<{
  districtLabel: string;
  address: string;
}>) {
  return (
    <div className="surface-panel overflow-hidden rounded-[32px] border border-white/70">
      <div className="relative h-64 overflow-hidden bg-[radial-gradient(circle_at_top_left,#d9f99d_0%,#bbf7d0_35%,#dcfce7_72%,#ffffff_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,34,22,0.08)_0%,transparent_40%,rgba(245,158,11,0.12)_100%)]" />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full bg-white/90 px-4 py-3 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white">
            <MapPinned className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">{districtLabel}</div>
            <div className="text-xs text-slate-600">{address}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
