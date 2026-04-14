import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Đăng nhập",
};

export default function SignInPage() {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#114b2c_0%,#1b5e20_45%,#f59e0b_150%)] p-8 text-white shadow-[0_24px_80px_rgba(17,75,44,0.28)] sm:p-10">
        <Badge className="mb-4 bg-white/14 text-white hover:bg-white/14">Mission Frontend Core</Badge>
        <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
          Khu vực xác thực đã sẵn sàng để nối với Clerk khi team bật frontend auth.
        </h1>
        <p className="mt-5 max-w-xl text-sm text-white/80 sm:text-base">
          Mình đã tạo route group `(auth)` để team có chỗ đặt luồng đăng nhập, onboarding và bảo vệ route.
          Trong phase hiện tại, giao diện này đóng vai trò placeholder sạch và có thể thay bằng Clerk UI bất cứ lúc nào.
        </p>
      </section>

      <Card className="surface-panel border-white/70 bg-white/85 shadow-[0_18px_60px_rgba(16,34,22,0.12)]">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>Clerk-ready sign in</CardTitle>
          <CardDescription>
            Phần này được chừa đúng chỗ để thay bằng `&lt;SignIn /&gt;` hoặc modal từ Clerk ở phase auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            Khi có `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, team chỉ cần bọc `ClerkProvider` ở root layout và thay
            card này bằng component chính thức của Clerk.
          </div>
          <Button asChild className="w-full">
            <Link href="/">
              Quay lại trang chủ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
