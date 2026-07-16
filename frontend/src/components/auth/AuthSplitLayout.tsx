import type { ReactNode } from "react";

interface AuthSplitLayoutProps {
  hero: ReactNode;
  form: ReactNode;
  themeToggle: ReactNode;
}

export function AuthSplitLayout({ hero, form, themeToggle }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-bg text-text">
      <div className="min-h-screen w-full px-6 py-10 lg:px-10">
        <div className="relative mx-auto min-h-[calc(100vh-5rem)] w-full max-w-[1400px]">
          <div className="absolute right-0 top-0 z-30">
            {themeToggle}
          </div>

          <div className="grid min-h-[calc(100vh-5rem)] grid-cols-1 items-stretch gap-6 pt-14 lg:grid-cols-[minmax(560px,1fr)_480px] lg:gap-10 lg:pt-0">
            <div className="flex min-h-[44vh] items-stretch lg:min-h-full lg:items-center">
              <div className="w-full max-w-[900px]">{hero}</div>
            </div>
            <div className="flex min-h-[56vh] items-center justify-center lg:min-h-full lg:justify-end">
              {form}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
