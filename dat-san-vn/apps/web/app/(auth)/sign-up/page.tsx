import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Đăng ký",
};

export default function SignUpPage() {
  return (
    <div className="flex w-full items-center justify-center py-12">
      <SignUp />
    </div>
  );
}
