import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { pickQuizQuestions, QuizQuestion } from "@/lib/quizBank";
import { Brain, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";

const QuizPage = () => {
  const { user, refreshProfile } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<{ correct: boolean; answer: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [final, setFinal] = useState<any>(null);
  const [entryFee, setEntryFee] = useState(10);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "quiz_config").maybeSingle()
      .then(({ data }) => { if (data?.value) setEntryFee(Number((data.value as any).entry_fee || 10)); });
  }, []);

  const start = async () => {
    if (!user) { toast.error("Sign in first"); return; }
    setBusy(true);
    const qs = pickQuizQuestions();
    const { data, error } = await supabase.rpc("start_quiz_session", { p_questions: qs as any });
    setBusy(false);
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Failed"); return; }
    setQuestions(qs);
    setSessionId(res.sessionId);
    setIdx(0);
    setAnswered([]);
    setFinal(null);
    await refreshProfile();
  };

  const submit = async (answer: string) => {
    if (!sessionId) return;
    const q = questions[idx];
    setBusy(true);
    const { data } = await supabase.rpc("submit_quiz_answer", { p_session_id: sessionId, p_question_id: q.id, p_answer: answer });
    setBusy(false);
    const res = data as any;
    setAnswered((prev) => [...prev, { correct: !!res?.correct, answer }]);
    if (idx + 1 >= questions.length) {
      const { data: fd } = await supabase.rpc("finish_quiz_session", { p_session_id: sessionId });
      setFinal(fd);
      await refreshProfile();
    } else {
      setTimeout(() => setIdx(idx + 1), 800);
    }
  };

  if (!sessionId || final) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Quiz Game</h1>
        </div>
        {final ? (
          <div className="surface-card rounded-xl p-6 text-center space-y-3">
            <p className="text-2xl font-bold">{(final as any).reward > 0 ? `🎉 +₹${Number((final as any).reward).toFixed(2)}` : "No reward this time"}</p>
            <p className="text-sm text-muted-foreground">{(final as any).correct} correct · {(final as any).wrong} wrong</p>
            <button onClick={start} disabled={busy} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Play Again</button>
          </div>
        ) : (
          <div className="surface-card rounded-xl p-6 text-center space-y-3">
            <p className="text-sm">10 questions · +₹1.25 per correct · −₹1 per wrong</p>
            <p className="text-xs text-muted-foreground">Entry fee: ₹{entryFee}</p>
            <button onClick={start} disabled={busy} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Start Quiz
            </button>
          </div>
        )}
      </div>
    );
  }

  const q = questions[idx];
  const last = answered[answered.length - 1];
  const showResult = answered.length > idx;

  return (
    <>
      <SEO title="Quiz — Trivia Challenge — FairClash" description="Play trivia quizzes on FairClash. Test your knowledge across multiple categories and climb the leaderboard." path="/quiz" jsonLd={{"@context":"https://schema.org","@type":"Game","name":"Quiz","url":"https://fair-clash-beta.lovable.app/quiz","provider":{"@type":"Organization","name":"Fair Fun Studios"},"genre":"Online Game"}} />
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">Question {idx + 1} / {questions.length}</p>
        <p className="text-xs font-mono-num">✓ {answered.filter(a => a.correct).length} · ✗ {answered.filter(a => !a.correct).length}</p>
      </div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${((idx + (showResult ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <div className="surface-card rounded-xl p-5 space-y-3">
        <p className="text-base font-semibold">{q.question}</p>
        <div className="grid grid-cols-1 gap-2">
          {q.options.map((opt) => {
            const isPicked = showResult && last?.answer === opt;
            return (
              <button key={opt} onClick={() => !showResult && submit(opt)} disabled={busy || showResult}
                className={cn("rounded-lg p-3 text-left border text-sm transition-colors",
                  isPicked && last?.correct ? "bg-success/15 border-success text-success" :
                  isPicked && !last?.correct ? "bg-destructive/15 border-destructive text-destructive" :
                  "border-border hover:border-primary/40")}>
                <span className="flex items-center justify-between">{opt}{isPicked && (last?.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
};

export default QuizPage;
