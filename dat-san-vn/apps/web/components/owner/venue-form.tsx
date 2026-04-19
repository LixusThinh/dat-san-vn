"use client";

import { useEffect } from "react";
import type { CreateVenuePayload } from "@dat-san-vn/types";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OwnerVenue } from "@/lib/owner-api";

interface VenueFormValues {
  name: string;
  description: string;
  address: string;
  district: string;
  city: string;
  latitude: string;
  longitude: string;
  images: string;
  amenities: string;
}

const defaultValues: VenueFormValues = {
  name: "",
  description: "",
  address: "",
  district: "",
  city: "",
  latitude: "",
  longitude: "",
  images: "",
  amenities: "",
};

function toMultiValueList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function VenueForm({
  venue,
  submitting = false,
  onSubmit,
  onCancel,
}: Readonly<{
  venue?: OwnerVenue | null;
  submitting?: boolean;
  onSubmit: (payload: CreateVenuePayload) => void | Promise<void>;
  onCancel?: () => void;
}>) {
  const form = useForm<VenueFormValues>({
    defaultValues,
  });

  useEffect(() => {
    form.reset({
      name: venue?.name ?? "",
      description: venue?.description ?? "",
      address: venue?.address ?? "",
      district: venue?.district ?? "",
      city: venue?.city ?? "",
      latitude: "",
      longitude: "",
      images: "",
      amenities: "",
    });
  }, [form, venue]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      address: values.address.trim(),
      district: values.district.trim(),
      city: values.city.trim(),
      latitude: values.latitude ? Number(values.latitude) : undefined,
      longitude: values.longitude ? Number(values.longitude) : undefined,
      images: toMultiValueList(values.images),
      amenities: toMultiValueList(values.amenities),
    } satisfies CreateVenuePayload;

    await onSubmit(payload);
  });

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="venue-name">Tên sân</Label>
        <Input id="venue-name" placeholder="Ví dụ: Sân bóng Thành Công" {...form.register("name", { required: true })} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="venue-description">Mô tả</Label>
        <Textarea
          id="venue-description"
          placeholder="Mô tả ngắn về sân, chỗ gửi xe, đèn chiếu sáng..."
          {...form.register("description")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="venue-address">Địa chỉ</Label>
        <Input id="venue-address" placeholder="Số nhà, đường, phường/xã" {...form.register("address", { required: true })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="venue-district">Quận/Huyện</Label>
          <Input id="venue-district" placeholder="Quận 7" {...form.register("district", { required: true })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="venue-city">Tỉnh/Thành phố</Label>
          <Input id="venue-city" placeholder="TP. Hồ Chí Minh" {...form.register("city", { required: true })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="venue-latitude">Vĩ độ</Label>
          <Input id="venue-latitude" type="number" step="any" placeholder="10.7769" {...form.register("latitude")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="venue-longitude">Kinh độ</Label>
          <Input id="venue-longitude" type="number" step="any" placeholder="106.7009" {...form.register("longitude")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="venue-images">Ảnh (mỗi dòng một URL)</Label>
          <Textarea id="venue-images" placeholder="https://..." className="min-h-[96px]" {...form.register("images")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="venue-amenities">Tiện ích (mỗi dòng một mục)</Label>
          <Textarea id="venue-amenities" placeholder="Bãi giữ xe&#10;Nước uống" className="min-h-[96px]" {...form.register("amenities")} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Đóng
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : venue ? "Lưu thay đổi" : "Tạo sân"}
        </Button>
      </div>
    </form>
  );
}
