import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AppHeader } from "./AppHeader";
import { Footer } from "./Footer";

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
