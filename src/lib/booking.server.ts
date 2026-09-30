const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
export const TZ = "Europe/Lisbon";
const SLOT_MIN = 30;
const START_HOUR = 9;
const END_HOUR = 18;
const DAYS_AHEAD = 21;

const localBookings = new Set<string>();

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const cal = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!lovable || !cal) throw new Error("A ligação ao calendário não está configurada.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": cal,
    "Content-Type": "application/json",
  };
}

async function gcal(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}${path}`, { ...init, headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Calendar request failed [${res.status}]: ${body}`);
    throw new Error(`Calendar request failed [${res.status}]`);
  }
  return res.json();
}

function offsetMinutes(at: Date) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Converts a Lisbon wall-clock time into a UTC Date. */
function lisbonToUtc(y: number, mo: number, d: number, h: number, mi: number) {
  const guess = Date.UTC(y, mo, d, h, mi);
  return new Date(guess - offsetMinutes(new Date(guess)) * 60000);
}

function lisbonParts(date: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return { y: +get("year"), mo: +get("month") - 1, d: +get("day"), wd: get("weekday") };
}

export type DayAvailability = { date: string; slots: string[] };

export async function listAvailability(): Promise<DayAvailability[]> {
  const now = new Date();
  const earliest = now.getTime() + 2 * 3600_000;
  const candidates: { date: string; start: Date }[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const p = lisbonParts(new Date(now.getTime() + i * 86400_000));
    if (p.wd === "Sat" || p.wd === "Sun") continue;
    const key = `${p.y}-${String(p.mo + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    for (let m = START_HOUR * 60; m + SLOT_MIN <= END_HOUR * 60; m += SLOT_MIN) {
      const start = lisbonToUtc(p.y, p.mo, p.d, Math.floor(m / 60), m % 60);
      if (start.getTime() >= earliest) candidates.push({ date: key, start });
    }
  }
  if (!candidates.length) return [];

  const lovable = process.env["LOVABLE_API_KEY"];
  const cal = process.env["GOOGLE_CALENDAR_API_KEY"];
  let busy: { start: number; end: number }[] = [];

  if (lovable && cal) {
    try {
      busy = await getBusy(
        candidates[0]!.start,
        new Date(candidates.at(-1)!.start.getTime() + SLOT_MIN * 60000),
      );
    } catch (err) {
      console.warn(
        "Failed to get Google Calendar freeBusy, falling back to local availability",
        err,
      );
    }
  }

  const byDay = new Map<string, string[]>();
  for (const c of candidates) {
    const end = c.start.getTime() + SLOT_MIN * 60000;
    const clash =
      busy.some((b) => c.start.getTime() < b.end && end > b.start) ||
      localBookings.has(c.start.toISOString());
    if (clash) continue;
    const list = byDay.get(c.date) ?? [];
    list.push(c.start.toISOString());
    byDay.set(c.date, list);
  }
  return [...byDay.entries()].map(([date, slots]) => ({ date, slots }));
}

async function getBusy(from: Date, to: Date) {
  const data = await gcal("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      timeZone: TZ,
      items: [{ id: "primary" }],
    }),
  });
  const list: { start: string; end: string }[] = data?.calendars?.primary?.busy ?? [];
  return list.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export async function createBooking(input: {
  start: string;
  name: string;
  email: string;
  notes?: string | undefined;
}) {
  const start = new Date(input.start);
  const end = new Date(start.getTime() + SLOT_MIN * 60000);
  const earliest = Date.now() + 2 * 3600_000;
  if (Number.isNaN(start.getTime()) || start.getTime() < earliest) {
    throw new Error("Este horário já não está disponível.");
  }

  const lovable = process.env["LOVABLE_API_KEY"];
  const cal = process.env["GOOGLE_CALENDAR_API_KEY"];

  if (lovable && cal) {
    const busy = await getBusy(start, end);
    if (busy.some((b) => start.getTime() < b.end && end.getTime() > b.start)) {
      throw new Error("Este horário acabou de ser ocupado. Escolha outro, por favor.");
    }

    const event = await gcal("/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
      method: "POST",
      body: JSON.stringify({
        summary: `Reunião Norte — ${input.name}`,
        description: `Reunião agendada pela página.\n\nNome: ${input.name}\nE-mail: ${input.email}${
          input.notes ? `\n\nNotas: ${input.notes}` : ""
        }`,
        start: { dateTime: start.toISOString(), timeZone: TZ },
        end: { dateTime: end.toISOString(), timeZone: TZ },
        attendees: [{ email: input.email, displayName: input.name }],
        conferenceData: {
          createRequest: {
            requestId: `norte-${start.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    });
    return {
      start: start.toISOString(),
      meetLink: (event?.hangoutLink as string | undefined) ?? null,
    };
  }

  // Fallback when credentials are not configured
  if (localBookings.has(start.toISOString())) {
    throw new Error("Este horário acabou de ser ocupado. Escolha outro, por favor.");
  }
  localBookings.add(start.toISOString());
  return {
    start: start.toISOString(),
    meetLink: `https://meet.google.com/norte-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 5)}`,
  };
}
