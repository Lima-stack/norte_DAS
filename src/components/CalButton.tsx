import { useEffect, useState } from "react";
import { getCalApi } from "@calcom/embed-react";
import { Check } from "lucide-react";

// Cole aqui o seu link Cal.com (ex: "miguel-lima/30min"). Vazio = opção escondida.
export const CAL_LINK = "miguel-lima-pyhrzo/30min";
const NS = "norte";

export function CalButton() {
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!CAL_LINK) return;
    let cancelled = false;
    void (async () => {
      const cal = await getCalApi({ namespace: NS });
      if (cancelled) return;
      cal("ui", {
        theme: "light",
        hideEventTypeDetails: false,
        layout: "month_view",
        cssVarsPerTheme: {
          light: { "cal-brand": "oklch(0.645 0.213 32.5)", "cal-text": "oklch(0.19 0.014 265)" },
          dark: { "cal-brand": "oklch(0.645 0.213 32.5)" },
        },
      });
      cal("on", { action: "bookingSuccessful", callback: () => setBooked(true) });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CAL_LINK) return null;

  if (booked)
    return (
      <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink">
        <Check className="size-4 text-brand" /> Reunião marcada. O convite segue por e-mail.
      </p>
    );

  return (
    <button
      type="button"
      data-cal-namespace={NS}
      data-cal-link={CAL_LINK}
      data-cal-config='{"layout":"month_view","theme":"light"}'
      className="mt-4 w-full rounded-[12px] border border-line bg-panel px-5 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink/30"
    >
      Prefere agendar pelo Cal.com
    </button>
  );
}
