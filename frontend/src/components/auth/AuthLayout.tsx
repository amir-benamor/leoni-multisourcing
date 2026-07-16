import type { ReactNode } from "react";

interface AuthLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function AuthLayout({ left, right }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto min-h-screen max-w-[1600px] lg:grid lg:grid-cols-[1.1fr_1fr]">
        <div>{left}</div>
        <div className="relative">{right}</div>
      </div>
    </div>
  );
}
