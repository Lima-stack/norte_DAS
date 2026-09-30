import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Rocket,
  LineChart,
  Store,
  Palette,
  PiggyBank,
  Sparkles,
  Globe,
  Plus,
  ArrowRight,
} from "lucide-react";
import { ChatWidget } from "@/components/ChatWidget";
import { BookingModal, openBooking } from "@/components/BookingModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Norte — O seu negócio começa aqui" },
      {
        name: "description",
        content:
          "Comece gratuitamente, continue por 1 €/mês e ganhe até 8000 € em créditos à medida que vende. Loja online, créditos, assistente de IA e venda omnicanal.",
      },
      { property: "og:title", content: "Norte — O seu negócio começa aqui" },
      {
        property: "og:description",
        content:
          "Comece gratuitamente, continue por 1 €/mês e ganhe até 8000 € em créditos à medida que vende.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/* --- Scroll reveal --- */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "-10% 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${shown ? "reveal" : "opacity-0"}`}
      style={shown ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

function EmailForm({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 255;

  return (
    <form
      className="flex max-w-[520px] flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setSent(true);
      }}
    >
      <div className="flex-1">
        <label htmlFor={id} className="sr-only">
          E-mail
        </label>
        <input
          id={id}
          type="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSent(false);
          }}
          placeholder="introduza o seu e-mail"
          className="w-full rounded-[12px] border border-white/70 bg-panel/70 px-4 py-3.5 text-sm backdrop-blur placeholder:text-ink-soft/60 focus:border-brand/40 focus:ring-2 focus:ring-brand/40 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="accent-glow rounded-[12px] bg-brand px-5 py-3.5 text-sm font-medium text-panel transition-colors hover:bg-brand/90"
      >
        {sent ? "Enviado" : "Comece gratuitamente"}
      </button>
    </form>
  );
}

const brands = [
  "Mejuri",
  "Gymshark",
  "Brooklinen",
  "Leesa",
  "Kylie Cosmetics",
  "Crate & Barrel",
  "Monos",
];

const personas = [
  {
    initial: "A",
    Icon: Rocket,
    name: "André, fundador",
    frustration: "Quer lançar a marca sem contratar um desenvolvedor.",
    outcome: "\u201cQuero a loja no ar esta semana.\u201d",
    tone: "bg-brand-soft text-brand",
  },
  {
    initial: "M",
    Icon: LineChart,
    name: "Marta, gestora",
    frustration: "Precisa de controlar margens e créditos em tempo real.",
    outcome: "\u201cQuero ver o retorno de cada venda.\u201d",
    tone: "bg-brand-soft/60 text-brand",
  },
  {
    initial: "R",
    Icon: Store,
    name: "Rui, operador",
    frustration: "Vende em vários canais e quer tudo num só lugar.",
    outcome: "\u201cQuero vender onde as pessoas já estão.\u201d",
    tone: "bg-brand-soft/40 text-brand",
  },
];

const faqs = [
  [
    "O que é a Norte e como funciona?",
    "Uma plataforma completa para criar, gerir e crescer a sua loja online, sem conhecimentos técnicos.",
  ],
  [
    "Quanto custa?",
    "Comece gratuitamente e continue por 1 €/mês, com até 8000 € em créditos à medida que vende.",
  ],
  [
    "Posso usar o meu próprio domínio?",
    "Sim. Ligue o seu domínio em minutos e mantenha o controlo total da sua marca.",
  ],
  [
    "Preciso de ser designer?",
    "Não. Os temas pré-criados permitem-lhe lançar uma loja profissional em segundos.",
  ],
  [
    "Preciso de cartão de crédito?",
    "Não. A fase inicial é gratuita e não exige cartão de crédito.",
  ],
  [
    "Como funcionam os créditos de 0.5%?",
    "Cada venda gera 0.5% de retorno em créditos de subscrição, até 8000 €.",
  ],
  [
    "Posso vender em vários canais?",
    "Sim. Venda na sua loja, em redes sociais, pesquisa e marketplaces.",
  ],
  ["O assistente de IA é incluído?", "Sim. Tem milhões de tokens de IA incluídos no plano."],
  [
    "Posso cancelar quando quiser?",
    "Sim. Sem contratos de longo prazo, cancele a qualquer momento.",
  ],
  [
    "Está disponível em português?",
    "Sim. A plataforma e o suporte estão disponíveis em português.",
  ],
  [
    "Como é o suporte?",
    "Suporte contínuo por chat e e-mail, com um assistente de IA sempre disponível.",
  ],
  [
    "Os meus dados são meus?",
    "Sim. Pode exportar produtos, clientes e encomendas a qualquer momento.",
  ],
];

const bars = ["40%", "55%", "48%", "70%", "82%", "100%"];

function Index() {
  return (
    <div className="min-h-screen bg-paper font-body text-ink antialiased selection:bg-brand/20">
      {/* NAV */}
      <header className="relative z-20 pt-4">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="glass flex items-center justify-between rounded-[16px] py-3 pr-3 pl-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-sm font-semibold text-panel">
                N
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight">Norte</span>
            </div>
            <nav className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
              <a href="#features" className="transition-colors hover:text-ink">
                Funcionalidades
              </a>
              <a href="#prova" className="transition-colors hover:text-ink">
                Prova
              </a>
              <a href="#faq" className="transition-colors hover:text-ink">
                Perguntas
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openBooking()}
                className="hidden items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-line sm:inline-flex"
              >
                Agendar reunião
              </button>
              <a
                href="#cta"
                className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-3 py-2 text-sm font-medium text-panel transition-colors hover:bg-ink/90"
              >
                Comece gratuitamente
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="diag relative overflow-hidden">
        <div className="diag-stripes pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-[520px] rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[460px] rounded-full bg-brand-soft/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="reveal" style={{ animationDelay: "0.05s" }}>
                <span className="glass-deep inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft">
                  <span className="size-1.5 rounded-full bg-brand" />
                  Loja aberta desde o primeiro dia
                </span>
              </div>
              <h1
                className="reveal mt-6 max-w-[16ch] font-display text-[clamp(2.6rem,6vw,4.75rem)] leading-none font-semibold tracking-tight text-balance"
                style={{ animationDelay: "0.15s" }}
              >
                O seu negócio começa com a Norte
              </h1>
              <p
                className="reveal mt-6 max-w-[46ch] text-base leading-relaxed text-ink-soft text-pretty sm:text-lg"
                style={{ animationDelay: "0.25s" }}
              >
                Comece gratuitamente, continue a construir o seu negócio por 1 €/mês. Além disso,
                ganhe até 8000 € em créditos à medida que vende.
              </p>

              <div className="reveal mt-8" style={{ animationDelay: "0.35s" }}>
                <EmailForm id="hero-email" />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="#features"
                    className="inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-brand"
                  >
                    Ver demonstração
                    <ArrowRight className="size-4 text-brand" />
                  </a>
                  <p className="max-w-[34ch] text-xs text-ink-soft/80 text-pretty">
                    Concorda em receber e-mails de marketing. Sem cartão de crédito.
                  </p>
                </div>
              </div>
            </div>

            {/* HERO MOCKUP */}
            <div className="reveal lg:col-span-5" style={{ animationDelay: "0.25s" }}>
              <div className="glass lift rounded-[22px] p-4">
                <div className="flex items-center justify-between px-1 pb-3">
                  <span className="text-xs font-medium text-ink-soft">Painel de vendas</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                    <span className="size-1.5 rounded-full bg-brand" /> Ao vivo
                  </span>
                </div>
                <div className="rounded-[14px] bg-panel/80 p-4 ring-1 ring-ink/5">
                  <p className="text-xs text-ink-soft">Total de vendas</p>
                  <p className="count mt-1 font-display text-3xl font-semibold tracking-tight">
                    800 000 €
                  </p>
                  <div className="mt-4 flex h-16 items-end gap-1.5">
                    {bars.map((h, i) => (
                      <span
                        key={h + i}
                        className="w-full rounded-t-[3px] bg-brand"
                        style={{ height: h, opacity: 0.25 + i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGO WALL */}
      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <p className="mb-7 text-center text-xs tracking-[0.2em] text-ink-soft/70 uppercase">
            Marcas que crescem com a Norte
          </p>
          <div className="grid grid-cols-2 items-center gap-x-6 gap-y-6 sm:grid-cols-4 lg:grid-cols-7">
            {brands.map((b) => (
              <span
                key={b}
                className="text-center font-display text-sm font-semibold text-ink-soft/70"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal className="max-w-[40ch]">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Feito para quem vende
          </h2>
          <p className="mt-3 text-ink-soft text-pretty">
            Três perfis, um objetivo: abrir a loja e deixar a Norte a trabalhar por si.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {personas.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <div className="glass lift h-full rounded-[18px] p-6">
                <div
                  className={`grid size-11 place-items-center rounded-[12px] ${p.tone}`}
                  aria-hidden
                >
                  <p.Icon className="size-5" />
                </div>
                <p className="mt-4 font-display text-lg font-semibold">{p.name}</p>
                <p className="mt-1 text-sm text-ink-soft">{p.frustration}</p>
                <p className="mt-4 border-l-2 border-brand/40 pl-3 text-sm text-ink-soft/80">
                  {p.outcome}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl px-5 pb-8 sm:px-8">
        <Reveal className="max-w-[40ch]">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Tudo já está montado para si
          </h2>
          <p className="mt-3 text-ink-soft text-pretty">
            Quatro pilares que fazem a loja abrir, vender e crescer — sem fricção.
          </p>
        </Reveal>

        {/* F1 Temas */}
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] text-brand uppercase">
              <Palette className="size-4" /> Temas
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Crie uma loja impressionante em segundos
            </h3>
            <p className="mt-3 text-ink-soft text-pretty">
              Os designs pré-criados tornam fácil e rápido impulsionar a sua marca.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="glass lift rounded-[20px] p-4">
              <div className="rounded-[14px] bg-panel/80 p-4 ring-1 ring-ink/5">
                <p className="text-xs text-ink-soft">Total de vendas</p>
                <p className="count mt-1 font-display text-3xl font-semibold tracking-tight">
                  800 000 €
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-[10px] bg-brand-soft" />
                  <div className="h-16 rounded-[10px] bg-brand-soft/60" />
                  <div className="h-16 rounded-[10px] bg-brand-soft/35" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* F2 Créditos */}
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="lg:order-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] text-brand uppercase">
              <PiggyBank className="size-4" /> Créditos
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              O seu plano pode pagar-se a si próprio
            </h3>
            <p className="mt-3 text-ink-soft text-pretty">
              Transforme vendas em poupanças com 0.5% de retorno em créditos de subscrição.
            </p>
          </Reveal>
          <Reveal className="lg:order-1" delay={0.1}>
            <div className="glass lift rounded-[20px] p-4">
              <div className="rounded-[14px] bg-panel/80 p-4 ring-1 ring-ink/5">
                <p className="text-xs text-ink-soft">Os seus créditos</p>
                <p className="count mt-1 font-display text-3xl font-semibold tracking-tight text-brand">
                  +8000 €
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full w-3/4 rounded-full bg-brand" />
                </div>
                <p className="mt-2 text-[11px] text-ink-soft/80">0.5% de retorno por venda</p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* F3 IA */}
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] text-brand uppercase">
              <Sparkles className="size-4" /> Assistente de IA
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Suba de nível com o nosso assistente de IA
            </h3>
            <p className="mt-3 text-ink-soft text-pretty">
              Com milhões de tokens de IA para utilizar com o nosso assistente integrado, pode
              crescer sem limites.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="glass lift rounded-[20px] p-4">
              <div className="rounded-[14px] bg-panel/80 p-4 ring-1 ring-ink/5">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-display text-xs font-semibold text-panel">
                    N
                  </span>
                  <div className="max-w-[80%] rounded-[14px] rounded-tl-[3px] bg-ink px-4 py-3 text-sm text-panel">
                    Olá, André. Como posso ajudar?
                  </div>
                </div>
                <div className="mt-3 flex flex-row-reverse items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-xs font-semibold text-brand">
                    A
                  </span>
                  <div className="max-w-[80%] rounded-[14px] rounded-tr-[3px] bg-brand-soft px-4 py-3 text-sm text-ink">
                    Qual foi o meu melhor produto esta semana?
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* F4 Omnicanal */}
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="lg:order-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] text-brand uppercase">
              <Globe className="size-4" /> Omnicanal
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Marcar presença onde as pessoas compram
            </h3>
            <p className="mt-3 text-ink-soft text-pretty">
              Disponibilize os produtos onde as pessoas conversam, navegam, pesquisam e compram.
            </p>
          </Reveal>
          <Reveal className="lg:order-1" delay={0.1}>
            <div className="glass lift rounded-[20px] p-4">
              <div className="rounded-[14px] bg-panel/80 p-4 ring-1 ring-ink/5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[10px] bg-brand-soft p-3 text-xs font-medium text-brand">
                    Loja online
                  </div>
                  <div className="rounded-[10px] bg-brand-soft/60 p-3 text-xs font-medium text-brand">
                    Redes sociais
                  </div>
                  <div className="rounded-[10px] bg-brand-soft/45 p-3 text-xs font-medium text-brand">
                    Pesquisa
                  </div>
                  <div className="rounded-[10px] bg-brand-soft/30 p-3 text-xs font-medium text-brand">
                    Marketplace
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section id="prova" className="diag relative mt-20 overflow-hidden">
        <div className="diag-stripes pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <span className="font-display text-6xl leading-none text-brand/40">&ldquo;</span>
          <blockquote className="font-display text-2xl leading-snug font-medium tracking-tight text-balance sm:text-3xl">
            Triplicámos de tamanho desde que começámos na Norte. Isso dá-nos as ferramentas de que
            precisamos para continuar a crescer.
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-ink font-display font-semibold text-panel">
              C
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Clare Jerome</p>
              <p className="text-xs text-ink-soft">NEOM Wellbeing</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <div className="glass rounded-[28px] p-8 text-center sm:p-12">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Sem riscos, só vantagens
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] text-ink-soft text-pretty">
              Experimente a Norte por 1 €/mês. Além disso, ganhe até 8000 € em créditos à medida que
              vende.
            </p>
            <div className="mt-8 flex justify-center">
              <EmailForm id="cta-email" />
            </div>
            <p className="mt-4 text-xs text-ink-soft/80">
              Concorda em receber e-mails de marketing. Sem cartão de crédito.
            </p>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Perguntas frequentes
        </h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-[15px] font-medium">{q}</span>
                <Plus className="size-4 shrink-0 text-brand transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm text-ink-soft text-pretty">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-sm font-semibold text-panel">
                N
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight">Norte</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
              <a href="#" className="transition-colors hover:text-ink">
                Termos
              </a>
              <a href="#" className="transition-colors hover:text-ink">
                Privacidade
              </a>
              <a href="#" className="transition-colors hover:text-ink">
                Mapa do site
              </a>
              <a href="#" className="transition-colors hover:text-ink">
                Opções de privacidade
              </a>
            </nav>
          </div>
          <p className="mt-8 text-xs text-ink-soft/70">
            © 2026 Norte. Todos os direitos reservados.
          </p>
        </div>
      </footer>
      <ChatWidget />
      <BookingModal />
    </div>
  );
}
