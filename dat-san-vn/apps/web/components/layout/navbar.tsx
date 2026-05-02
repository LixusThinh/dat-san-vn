"use client";

import Link from "next/link";
import { Menu, Search, LayoutDashboard, Building2 } from "lucide-react";
import { useUser, useAuth, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { href: "/", label: "Trang chủ" },
  { href: "/search", label: "Tìm sân" },
  { href: "/bookings", label: "Lịch đặt" },
];

export function Navbar() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    getToken().then((token) => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => setRole(data?.data?.role ?? null))
        .catch(() => {});
    });
  }, [isSignedIn, getToken]);

  return (
    <header className="sticky top-0 z-40 px-4 py-4 sm:px-6 lg:px-8">
      <div className="surface-panel mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white shadow-[0_12px_30px_rgba(17,80,42,0.22)]">
            <span className="text-lg font-bold">DS</span>
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-800">DatSanVN</div>
            <div className="text-xs text-slate-500">Đặt sân bóng đá trong vài chạm</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-700 transition hover:text-emerald-800">
              {item.label}
            </Link>
          ))}
          {role === "ADMIN" && (
            <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-800">
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </Link>
          )}
          {role === "OWNER" && (
            <Link href="/owner" className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 transition hover:text-emerald-900">
              <Building2 className="h-4 w-4" />
              Quản lý sân
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="secondary" size="sm">
            <Link href="/search">
              <Search className="h-4 w-4" />
              Tìm sân ngay
            </Link>
          </Button>
          {!isSignedIn ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Đăng nhập</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Đăng ký</Link>
              </Button>
            </div>
          ) : (
            <UserButton appearance={{ elements: { userButtonAvatarBox: "h-10 w-10" } }} />
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">DatSanVN</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Điều hướng nhanh</h2>
            </div>
            <div className="grid gap-3">
              {navigation.map((item) => (
                <Button key={item.href} asChild variant="secondary" className="justify-start rounded-2xl">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
              {role === "ADMIN" && (
                <Button asChild variant="secondary" className="justify-start rounded-2xl text-indigo-600">
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              {role === "OWNER" && (
                <Button asChild variant="secondary" className="justify-start rounded-2xl text-emerald-700">
                  <Link href="/owner">
                    <Building2 className="h-4 w-4" />
                    Quản lý sân
                  </Link>
                </Button>
              )}
            </div>
            <div className="rounded-[28px] bg-emerald-50 p-5">
              {!isSignedIn ? (
                <div className="flex flex-col gap-3">
                  <div className="mb-1 font-semibold text-slate-950">Thành viên</div>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/sign-in">Đăng nhập</Link>
                  </Button>
                  <Button asChild className="w-full justify-start">
                    <Link href="/sign-up">Đăng ký mới</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="font-semibold text-slate-950">Tài khoản của bạn</div>
                  <UserButton showName appearance={{ elements: { rootBox: "w-full" } }} />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
