import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "../components/shell/Sidebar";
import { Topbar } from "../components/shell/Topbar";
import { MobileSidebarDrawer } from "../components/shell/MobileSidebarDrawer";
import { FiltersProvider } from "../context/FiltersContext";

interface AppShellLayoutProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AppShellLayout({ theme, onToggleTheme }: AppShellLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <FiltersProvider>
      <div className="min-h-screen bg-bg text-text">
        <aside className="fixed left-0 top-0 hidden h-screen w-[264px] border-r border-border bg-surface lg:block">
          <Sidebar />
        </aside>

        <div className="flex min-h-screen flex-col lg:pl-[264px]">
          <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
            <Topbar
              theme={theme}
              onToggleTheme={onToggleTheme}
              onOpenSidebar={() => setMobileSidebarOpen(true)}
            />
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>

        <MobileSidebarDrawer open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      </div>
    </FiltersProvider>
  );
}
