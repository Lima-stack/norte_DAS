import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, CalendarDays, MessageCircle, X } from "lucide-react";
import { openBooking } from "./BookingModal";

const STORAGE_KEY = "norte-chat";
const WELCOME: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Olá. Sou o assistente da Norte.\nPosso ajudar com preços, créditos, temas ou venda em vários canais. O que gostaria de saber?",
    },
  ],
};

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => {
      const msg = e.message || "";
      if (msg.includes("429")) setError("Muitos pedidos. Tente novamente dentro de instantes.");
      else if (msg.includes("402")) setError("O assistente está temporariamente indisponível.");
      else setError("Não foi possível obter resposta. Tente novamente.");
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Restore session history
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as UIMessage[]);
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, [setMessages]);

  // Persist session history
  useEffect(() => {
    if (!loaded.current || busy) return;
    if (messages.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, busy]);

  // Welcome on first open
  useEffect(() => {
    if (open && messages.length === 0) setMessages([WELCOME]);
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, messages.length, setMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    if (!busy && open) inputRef.current?.focus();
  }, [messages, busy, open]);

  const submit = () => {
    const text = input.trim().slice(0, 1000);
    if (!text || busy) return;
    setError(null);
    setInput("");
    void sendMessage({ text });
  };

  const last = messages.at(-1);
  const waiting = busy && (last?.role === "user" || !textOf(last!).trim());

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Assistente Norte"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden border border-line bg-paper shadow-[var(--glass-shadow-hover)] font-body text-ink sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[560px] sm:max-h-[calc(100vh-8rem)] sm:w-[380px] sm:rounded-[20px]"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-sm font-semibold text-panel">
                N
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold tracking-tight">
                  Assistente Norte
                </p>
                <p className="text-xs text-ink-soft">Responde em segundos</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
              className="grid size-8 place-items-center rounded-[10px] text-ink-soft transition-colors hover:bg-line hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((m) => {
              const text = textOf(m);
              if (!text.trim()) return null;
              return m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-[14px] rounded-br-[4px] bg-ink px-3.5 py-2.5 text-sm whitespace-pre-wrap text-panel">
                    {text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-xs font-semibold text-brand">
                    N
                  </span>
                  <div className="max-w-[85%] space-y-2 pt-0.5 text-sm leading-relaxed text-ink [&_a]:text-brand [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4">
                    <ReactMarkdown>{text.replace(/\n/g, "  \n")}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
            {waiting && (
              <div className="flex items-center gap-2.5 text-sm text-ink-soft">
                <span className="grid size-7 place-items-center rounded-full bg-brand-soft font-display text-xs font-semibold text-brand">
                  N
                </span>
                <span className="inline-flex items-center gap-1">
                  a escrever
                  <span className="inline-flex gap-0.5">
                    <span className="size-1 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.3s]" />
                    <span className="size-1 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.15s]" />
                    <span className="size-1 animate-bounce rounded-full bg-ink-soft" />
                  </span>
                </span>
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line px-4 pt-3 pb-4">
            <button
              onClick={() => openBooking()}
              className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand-soft/70"
            >
              <CalendarDays className="size-3.5" /> Agendar reunião
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex items-end gap-2 rounded-[12px] border border-line bg-panel px-3 py-2 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/30"
            >
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={1000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Escreva a sua pergunta"
                aria-label="Mensagem"
                className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm placeholder:text-ink-soft/60 focus:outline-none"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  aria-label="Parar"
                  className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-ink text-panel"
                >
                  <span className="size-2.5 rounded-[2px] bg-panel" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Enviar"
                  className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand text-panel transition-colors hover:bg-brand/90 disabled:opacity-40"
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        className={`accent-glow fixed right-5 bottom-5 z-50 size-14 place-items-center rounded-full bg-brand text-panel transition-transform hover:scale-105 sm:right-6 sm:bottom-6 ${
          open ? "hidden sm:grid" : "grid"
        }`}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </>
  );
}
