import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, X } from "lucide-react";
import { bookMeeting, getAvailability } from "@/lib/booking.functions";
import { CalButton } from "@/components/CalButton";

const EVENT = "norte:open-booking";
export function openBooking() {
  window.dispatchEvent(new Event(EVENT));
}

const TZ = "Europe/Lisbon";
const fmtDay = new Intl.DateTimeFormat("pt-PT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const fmtTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
const fmtFull = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

export function BookingModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(EVENT, on);
    if (window.location.hash === "#agendar") setOpen(true);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Agendar reunião"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[100dvh] border border-line shadow-[var(--glass-shadow-hover)] w-full overflow-y-auto bg-paper font-body text-ink sm:max-w-[640px] sm:rounded-[20px]"
      >
        <BookingFlow onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

function BookingFlow({ onClose }: { onClose: () => void }) {
  const fetchAvail = useServerFn(getAvailability);
  const book = useServerFn(bookMeeting);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["availability"],
    queryFn: () => fetchAvail(),
    staleTime: 30_000,
  });
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ start: string; meetLink: string | null } | null>(null);

  const days = data ?? [];
  const activeDay = day ?? days[0]?.date ?? null;
  const slots = useMemo(
    () => days.find((d) => d.date === activeDay)?.slots ?? [],
    [days, activeDay],
  );
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    !!slot && name.trim().length > 0 && name.length <= 100 && validEmail && !sending;

  const submit = async () => {
    if (!canSubmit || !slot) return;
    setSending(true);
    setError(null);
    try {
      const res = await book({ data: { start: slot, name: name.trim(), email: email.trim() } });
      if (res.ok) setDone({ start: res.start, meetLink: res.meetLink });
      else {
        setError(res.error);
        setSlot(null);
        void refetch();
      }
    } catch {
      setError("Não foi possível agendar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 grid size-8 place-items-center rounded-[10px] text-ink-soft transition-colors hover:bg-line hover:text-ink"
      >
        <X className="size-4" />
      </button>

      {done ? (
        <div className="py-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <Check className="size-6" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Reunião marcada
          </h2>
          <p className="mt-2 text-sm text-ink-soft first-letter:uppercase">
            {fmtFull.format(new Date(done.start))}
          </p>
          <p className="mt-1 text-sm text-ink-soft">Enviámos o convite para {email.trim()}.</p>
          {done.meetLink && (
            <a
              href={done.meetLink}
              target="_blank"
              rel="noreferrer"
              className="accent-glow mt-6 inline-flex rounded-[12px] bg-brand px-5 py-3.5 text-sm font-medium text-panel transition-colors hover:bg-brand/90"
            >
              Abrir link da reunião
            </a>
          )}
        </div>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
            <CalendarDays className="size-3.5" /> 30 minutos · Google Meet
          </span>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Agendar uma reunião
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">Escolha um horário. Nós tratamos do resto.</p>

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium tracking-wide text-ink-soft uppercase">Dia</p>
            {isLoading ? (
              <p className="text-sm text-ink-soft">A carregar disponibilidade…</p>
            ) : isError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar a disponibilidade.
              </p>
            ) : days.length === 0 ? (
              <p className="text-sm text-ink-soft">Sem horários livres nas próximas semanas.</p>
            ) : (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {days.map((d) => {
                  const active = d.date === activeDay;
                  return (
                    <button
                      key={d.date}
                      onClick={() => {
                        setDay(d.date);
                        setSlot(null);
                      }}
                      className={`shrink-0 rounded-[12px] border px-3.5 py-2.5 text-sm capitalize transition-colors ${
                        active
                          ? "border-ink bg-ink text-panel"
                          : "border-line bg-panel hover:border-ink/30"
                      }`}
                    >
                      {fmtDay.format(new Date(`${d.date}T12:00:00Z`))}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {slots.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium tracking-wide text-ink-soft uppercase">
                Hora (Lisboa)
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`count rounded-[10px] border py-2 text-sm transition-colors ${
                      slot === s
                        ? "border-brand bg-brand text-panel"
                        : "border-line bg-panel hover:border-brand/40"
                    }`}
                  >
                    {fmtTime.format(new Date(s))}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className="mt-6 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              aria-label="Nome"
              placeholder="o seu nome"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[12px] border border-line bg-panel px-4 py-3.5 text-sm placeholder:text-ink-soft/60 focus:border-brand/40 focus:ring-2 focus:ring-brand/40 focus:outline-none"
            />
            <input
              aria-label="E-mail"
              type="email"
              placeholder="o seu e-mail"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[12px] border border-line bg-panel px-4 py-3.5 text-sm placeholder:text-ink-soft/60 focus:border-brand/40 focus:ring-2 focus:ring-brand/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="accent-glow rounded-[12px] bg-brand px-5 py-3.5 text-sm font-medium text-panel transition-colors hover:bg-brand/90 disabled:opacity-40 disabled:shadow-none sm:col-span-2"
            >
              {sending
                ? "A agendar…"
                : slot
                  ? `Confirmar ${fmtTime.format(new Date(slot))}`
                  : "Escolha um horário"}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <p className="mt-3 text-xs text-ink-soft">
            Recebe o convite com o link da reunião por e-mail.
          </p>
          <CalButton />
        </>
      )}
    </div>
  );
}
