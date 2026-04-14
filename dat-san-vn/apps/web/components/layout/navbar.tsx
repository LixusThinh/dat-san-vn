"use client";

import Link from "next/link";
import { Menu, Search, Shield, Ticket } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { href: "/", label: "Trang chủ" },
  { href: "/search", label: "Tìm sân" },
  { href: "/bookings", label: "Lịch đặt" },
];

export function Navbar() {
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
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="secondary" size="sm">
            <Link href="/search">
              <Search className="h-4 w-4" />
              Tìm sân ngay
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-2 py-2 pr-4 text-left shadow-sm outline-none transition hover:bg-white">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>NV</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold text-slate-950">Người dùng demo</div>
                  <div className="text-xs text-slate-500">Clerk-ready menu</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/bookings">
                  <Ticket className="h-4 w-4" />
                  Lịch đặt của tôi
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sign-in">
                  <Shield className="h-4 w-4" />
                  Nối Clerk / Auth
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-3 py-2">
                <Badge variant="outline" className="bg-slate-50">
                  Frontend Core
                </Badge>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
            </div>
            <div className="rounded-[28px] bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>NV</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-slate-950">Clerk user menu</div>
                  <div className="text-sm text-slate-600">Sẵn chỗ để thay bằng UserButton ở phase auth.</div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
