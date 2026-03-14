import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";

const AIPage = () => {
  const [input, setInput] = useState("");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight mb-4">AI Assistant</h1>

      {/* Chat Area */}
      <div className="flex-1 surface-card rounded-lg p-6 flex flex-col items-center justify-center text-center mb-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Game AI Assistant</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ask about game rules, tournaments, or anything about the platform.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about games, rules, tournaments..."
          className="flex-1 h-11 rounded-lg bg-card border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
        />
        <button
          className="h-11 w-11 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
          disabled={!input.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AIPage;
