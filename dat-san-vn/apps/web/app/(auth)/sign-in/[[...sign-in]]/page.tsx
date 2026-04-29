import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Đăng nhập",
};

export default function SignInPage() {
  return (
    <div className="flex w-full items-center justify-center py-12">
      <SignIn 
        // Optional: redirect sau khi sign in
        fallbackRedirectUrl="/"
        // Optional: redirect nếu đã sign in
        forceRedirectUrl="/"
      />
    </div>
  );
}
