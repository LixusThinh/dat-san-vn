import type { FieldSize, SportType } from "@dat-san-vn/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRating(value: number) {
  return value.toFixed(1);
}

export function capitalizeWords(value: string) {
  return value
    .split(" ")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase())
    .join(" ");
}

export function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDateLabel(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không xác định";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function extractTimeParts(value: string | Date) {
  if (value instanceof Date) {
    return {
      hours: value.getHours(),
      minutes: value.getMinutes(),
      seconds: value.getSeconds(),
    };
  }

  const isoMatch = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    return {
      hours: Number(isoMatch[1]),
      minutes: Number(isoMatch[2]),
      seconds: Number(isoMatch[3] ?? 0),
    };
  }

  const timeMatch = value.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    return {
      hours: Number(timeMatch[1]),
      minutes: Number(timeMatch[2]),
      seconds: Number(timeMatch[3] ?? 0),
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    hours: parsed.getHours(),
    minutes: parsed.getMinutes(),
    seconds: parsed.getSeconds(),
  };
}

export function formatTimeLabel(value: string | Date) {
  const parts = extractTimeParts(value);
  if (!parts) return "--:--";

  return `${parts.hours.toString().padStart(2, "0")}:${parts.minutes.toString().padStart(2, "0")}`;
}

export function formatTimeRange(start: string | Date, end: string | Date) {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}

export function combineDateAndTime(dateValue: string | Date, timeValue: string | Date) {
  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  const time = extractTimeParts(timeValue);

  if (Number.isNaN(date.getTime()) || !time) {
    return null;
  }

  const combined = new Date(date);
  combined.setHours(time.hours, time.minutes, time.seconds ?? 0, 0);
  return combined.toISOString();
}

export function isMoreThanHoursAway(dateTime: string | Date, hours: number) {
  const parsed = dateTime instanceof Date ? dateTime : new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() - Date.now() > hours * 60 * 60 * 1000;
}

const fieldSizeLabels: Record<FieldSize, string> = {
  FIELD_5: "Sân 5",
  FIELD_7: "Sân 7",
  FIELD_11: "Sân 11",
  OTHER: "Khác",
};

export function formatFieldSizeLabel(value: FieldSize) {
  return fieldSizeLabels[value];
}

const sportTypeLabels: Record<SportType, string> = {
  FOOTBALL: "Bóng đá",
  BADMINTON: "Cầu lông",
  TENNIS: "Tennis",
  BASKETBALL: "Bóng rổ",
  VOLLEYBALL: "Bóng chuyền",
  TABLE_TENNIS: "Bóng bàn",
  PICKLEBALL: "Pickleball",
};

export function formatSportTypeLabel(value: SportType) {
  return sportTypeLabels[value];
}
