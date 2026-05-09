import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");

const showBootError = (error: unknown) => {
  if (!root) return;
  const message = error instanceof Error ? error.message : "Application failed to start.";
  root.innerHTML = `<div class="min-h-screen flex items-center justify-center bg-background text-foreground p-6"><div class="surface-card rounded-lg max-w-md w-full p-6 text-center border border-destructive/30"><h1 class="text-lg font-bold">App startup error</h1><p class="text-sm text-muted-foreground mt-2">Please refresh. If this continues, contact support.</p><pre class="mt-4 text-left text-xs bg-secondary text-destructive rounded-md p-3 overflow-auto">${message.replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[char] || char))}</pre><button class="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium" onclick="window.location.reload()">Reload</button></div></div>`;
};

try {
  if (!root) throw new Error("Root element not found");
  createRoot(root).render(<App />);
} catch (error) {
  console.error("[Startup]", error);
  showBootError(error);
}
