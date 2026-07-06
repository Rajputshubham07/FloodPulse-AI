import { useState, useEffect, useRef } from "react";
import { 
  Bot, X, Send, Sparkles, Loader2, ShieldCheck, 
  HelpCircle, AlertTriangle, List, CheckSquare, BarChart3 
} from "lucide-react";

interface MunicipalCopilotProps {
  cityId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  evidence?: string[];
  confidence?: number;
  actions?: string[];
}

export default function MunicipalCopilot({ cityId, isOpen, onClose }: MunicipalCopilotProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadInsights = () => {
    if (!cityId) return;
    fetch(`/api/copilot/insights?cityId=${cityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setInsights(data);
        }
      });
  };

  useEffect(() => {
    if (isOpen && cityId) {
      loadInsights();
      // Load initial greeting
      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content: "Hello, I am your Municipal Copilot. Ask me any question about active waterlogging, weather forecasts, satellite verification, or evacuation readiness coordinates."
          }
        ]);
      }
    }
  }, [isOpen, cityId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId, query: text })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.summary,
            evidence: data.evidence,
            confidence: data.confidence,
            actions: data.recommendedActions
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error communicating with the AI completions server. Please try again."
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      loadInsights();
    }
  };

  const suggestedQuestions = [
    "Which ward is most at risk?",
    "Show critical active incidents.",
    "Where should rescue teams be deployed?",
    "Compare predicted vs satellite flooding.",
    "Summarize city flood status."
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] z-[3000] bg-slate-950 border-l border-slate-900 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
      
      {/* Copilot Header */}
      <div className="p-4 border-b border-slate-900 bg-slate-900/40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Bot className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Municipal Copilot <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Smart Operations Command Center</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Workspace Area: Chat & insights split */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col justify-between">
        
        {/* Chat Thread */}
        <div className="space-y-4 flex-1">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 items-start ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-indigo-400" />
                </div>
              )}
              
              <div className="space-y-2 max-w-[85%]">
                <div className={`p-3.5 rounded-xl text-xs leading-relaxed border ${
                  m.role === "user" 
                    ? "bg-blue-600 border-blue-500 text-white font-medium" 
                    : "bg-slate-900/60 border-slate-900 text-slate-200"
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>

                {/* Evidence List Card */}
                {m.evidence && m.evidence.length > 0 && (
                  <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-[10px] space-y-1 text-slate-400">
                    <p className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Telemetry Evidence (Confidence: {m.confidence}%)
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {m.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations checklist */}
                {m.actions && m.actions.length > 0 && (
                  <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-[10px] space-y-1.5 text-indigo-200">
                    <p className="font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5 text-indigo-400" /> Action Recommendations
                    </p>
                    <div className="space-y-1 pl-1">
                      {m.actions.map((ac, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <span>{ac}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs pl-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Analyzing databases & planning responses...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Insights Panel */}
        {insights && (
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3.5 space-y-3 shrink-0">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-800 pb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Hourly Smart City Insights
            </h4>
            <p className="text-[11px] text-slate-300 leading-normal">{insights.summary}</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <div>
                <p className="font-bold text-slate-300 mb-0.5">Alerts</p>
                <ul className="list-disc pl-3.5 space-y-0.5">
                  {insights.alerts.slice(0, 2).map((al: string, i: number) => (
                    <li key={i}>{al}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-bold text-slate-300 mb-0.5">Rankings</p>
                <div className="space-y-0.5">
                  {insights.wardRankings.slice(0, 2).map((rk: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate max-w-[80px]">{rk.name}</span>
                      <strong className="text-red-400">{rk.level}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggestion Cards */}
        {messages.length <= 1 && (
          <div className="space-y-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Suggested Questions</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(query); }}
        className="p-3 border-t border-slate-900 bg-slate-950 flex gap-2 items-center shrink-0 pointer-events-auto"
      >
        <input
          type="text"
          placeholder="Ask Copilot about risk parameters..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          className="flex-1 bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 text-white p-2.5 rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-md shadow-indigo-950/20"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
