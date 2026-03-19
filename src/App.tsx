import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import HomePage from "./pages/HomePage";
import GamesPage from "./pages/GamesPage";
import TournamentsPage from "./pages/TournamentsPage";
import WalletPage from "./pages/WalletPage";
import AIPage from "./pages/AIPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import PrivacyPage from "./pages/PrivacyPage";
import AuthPage from "./pages/AuthPage";
import AviatorPage from "./pages/AviatorPage";
import GamePlayPage from "./pages/GamePlayPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LudoPage from "./pages/LudoPage";
import RulesPage from "./pages/RulesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/ai" element={<AIPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/aviator" element={<AviatorPage />} />
                <Route path="/play/:id" element={<GamePlayPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/rules" element={<RulesPage />} />
              </Route>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
