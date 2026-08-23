import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot } from "lucide-react";
import { api } from "../services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  isThinking?: boolean;
}

export const CopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am the ARES Sourcing Copilot. I can advise you on our tariff exposures, supplier risks, and strategic sourcing scenarios. Select a topic below or type your question!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "How does ARES mitigate 8507 cell tariff?",
    "Compare Switch vs Split sourcing",
    "Check Ohio assembly plant inventory",
    "Are live USITC custom APIs connected?"
  ];

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Append User Message
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Append Temporary Thinking Message
    const thinkingMsg: Message = { role: "assistant", content: "ARES Copilot is analyzing metrics...", isThinking: true };
    setMessages((prev) => [...prev, thinkingMsg]);

    try {
      // Build conversation history for API (mapping to expected format if backend supports context)
      const history = messages
        .filter(m => !m.isThinking)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.chatCopilot(text, history);

      // Replace Thinking Message with Actual Response
      setMessages((prev) => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, { role: "assistant", content: res.reply }];
      });
    } catch (err) {
      console.error("Copilot chat failed:", err);
      setMessages((prev) => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, { role: "assistant", content: "Sorry, I encountered an operational error. Please verify the backend connection." }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-amber-600 hover:bg-amber-500 text-offwhite-50 p-4 rounded-full shadow-2xl border border-amber-500/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center cursor-pointer group"
          title="Open Sourcing Copilot"
        >
          <Sparkles className="w-6 h-6 animate-pulse text-offwhite-50 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Slide-up Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[480px] bg-navy-900 border border-navy-700 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.2s_ease-out]">
          {/* Header */}
          <div className="bg-navy-950 p-4 border-b border-navy-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-500" />
              <div>
                <h4 className="text-xs font-extrabold text-offwhite-50 uppercase tracking-widest">ARES Copilot</h4>
                <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
                  Active Trade Adviser
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-navy-800 rounded text-offwhite-300 hover:text-offwhite-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-navy-800">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-amber-600/90 text-offwhite-50 rounded-br-none"
                      : "bg-navy-950 text-offwhite-200 border border-navy-800 rounded-bl-none"
                  } ${msg.isThinking ? "opacity-60 italic" : ""}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Sourcing Suggestion Pills */}
          <div className="px-4 py-2 border-t border-navy-800 bg-navy-950/40 space-y-1.5">
            <span className="text-[9px] text-offwhite-300 font-bold block uppercase tracking-wider">Suggested Queries</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sug)}
                  disabled={isLoading}
                  className="text-[10px] text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded border border-amber-500/20 transition-all font-medium disabled:opacity-50 text-left"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Input Panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 bg-navy-950 border-t border-navy-800 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask ARES Copilot..."
              className="flex-1 bg-navy-900 border border-navy-850 rounded px-3 py-1.5 text-xs text-offwhite-50 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-500 text-offwhite-50 p-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
