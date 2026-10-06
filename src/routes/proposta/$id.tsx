import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  User,
  FileText,
  Clock,
  ArrowRight,
  Home,
  CheckCircle2,
  AlertTriangle,
  Info,
  CalendarDays,
  Sparkles,
  CreditCard,
  Layers,
} from "lucide-react";
import { consultarPropostaPublica } from "@/lib/proposta.functions";
import type { PropostaPublica } from "@/lib/proposta.server";

export const Route = createFileRoute("/proposta/$id")({
  loader: async ({ params }) => {
    const res = await consultarPropostaPublica({ data: { id: params.id } });
    return {
      proposta: res.proposta,
      id: params.id,
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.proposta
          ? `Proposta Comercial — ${loaderData.proposta.nomeCliente} | Norte`
          : "Proposta não encontrada (404) | Norte",
      },
      {
        name: "description",
        content: loaderData?.proposta
          ? `Proposta orçamentada personalizada para ${loaderData.proposta.nomeCliente} pela Norte.`
          : "A proposta solicitada não existe ou foi removida.",
      },
    ],
  }),
  component: PropostaPublicaPage,
});

function formatarDataExtensa(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatarMoeda(val: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(val);
}

function PropostaPublicaPage() {
  const { proposta, id } = Route.useLoaderData();

  if (!proposta) {
    return <PropostaNotFound id={id} />;
  }

  const { totais, itens, pedidosNaoCobertos } = proposta;

  return (
    <div className="min-h-screen bg-paper font-body text-ink antialiased selection:bg-brand/20">
      {/* CABEÇALHO */}
      <header className="relative z-20 border-b border-line bg-panel/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
              <span className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-sm font-semibold text-panel">
                N
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight">Norte</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs sm:text-sm font-medium text-ink-soft transition-colors hover:bg-line hover:text-ink sm:inline-flex"
              >
                <Home className="size-4" />
                Início
              </Link>
              <a
                href="/#agendar"
                className="accent-glow inline-flex items-center gap-2 rounded-[10px] bg-brand px-3.5 py-2 text-xs sm:text-sm font-semibold text-panel transition-all hover:bg-brand/90"
              >
                <CalendarDays className="size-4" />
                Agendar reunião
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="relative mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        {/* BANNER DE IDENTIFICAÇÃO */}
        <div className="glass relative overflow-hidden rounded-[24px] p-6 sm:p-10 shadow-[var(--glass-shadow)]">
          <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-brand/10 blur-3xl" />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1 text-xs font-semibold text-brand">
                <Sparkles className="size-3.5" />
                Proposta Comercial Oficial
              </span>
              {proposta.estado === "enviada" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-3 py-1 text-xs font-medium">
                  <CheckCircle2 className="size-3" />
                  Enviada por e-mail
                </span>
              )}
            </div>
            <span className="font-mono text-xs text-ink-soft">
              Ref: <span className="font-semibold text-ink">{proposta.id}</span>
            </span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Preparada para
              </p>
              <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                <User className="size-6 text-brand" />
                {proposta.nomeCliente}
              </h1>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Data de emissão
              </p>
              <p className="mt-1 flex items-center gap-2 font-medium text-ink sm:justify-end">
                <Calendar className="size-4 text-ink-soft" />
                {formatarDataExtensa(proposta.criadoEm)}
              </p>
            </div>
          </div>

          {/* RESUMO DO PEDIDO */}
          {proposta.resumo && (
            <div className="mt-8 rounded-[16px] border border-line bg-paper/60 p-5 sm:p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
                <FileText className="size-4" />
                Resumo do Pedido
              </p>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-ink text-pretty">
                {proposta.resumo}
              </p>
            </div>
          )}
        </div>

        {/* TABELA DE ITENS */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Serviços e Produtos Incluídos
            </h2>
            <span className="text-xs text-ink-soft">
              {itens.length} {itens.length === 1 ? "item" : "itens"}
            </span>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-line bg-panel shadow-sm">
            {/* VISTA DESKTOP: TABELA */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper/70 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    <th scope="col" className="px-6 py-4">
                      Serviço / Descrição
                    </th>
                    <th scope="col" className="px-4 py-4 text-center">
                      Qtd.
                    </th>
                    <th scope="col" className="px-4 py-4 text-right">
                      Preço Unitário
                    </th>
                    <th scope="col" className="px-6 py-4 text-right">
                      Subtotal (s/ IVA)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {itens.map((item, idx) => (
                    <tr
                      key={item.catalogoId || idx}
                      className="transition-colors hover:bg-paper/40"
                    >
                      <td className="px-6 py-5 align-top">
                        <div className="font-display font-semibold text-ink text-base">
                          {item.nome}
                        </div>
                        {item.descricao && (
                          <div className="mt-1 text-xs text-ink-soft leading-relaxed max-w-xl">
                            {item.descricao}
                          </div>
                        )}
                        {item.justificacao && item.justificacao !== item.descricao && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] bg-brand-soft/40 px-2.5 py-1 text-[11px] text-ink-soft">
                            <span className="font-medium text-brand">Aplicação:</span>
                            {item.justificacao}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5 align-top text-center font-mono font-medium text-ink">
                        {item.quantidade}
                      </td>
                      <td className="px-4 py-5 align-top text-right font-mono text-ink-soft">
                        {formatarMoeda(item.preco)}
                        <span className="block text-[11px] text-ink-soft/70">/ {item.unidade}</span>
                      </td>
                      <td className="px-6 py-5 align-top text-right font-mono font-semibold text-ink">
                        {formatarMoeda(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISTA MOBILE: CARDS */}
            <div className="divide-y divide-line sm:hidden">
              {itens.map((item, idx) => (
                <div key={item.catalogoId || idx} className="p-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold text-ink text-base">{item.nome}</h3>
                    <span className="font-mono font-semibold text-brand text-sm whitespace-nowrap">
                      {formatarMoeda(item.subtotal)}
                    </span>
                  </div>

                  {item.descricao && (
                    <p className="text-xs text-ink-soft leading-relaxed">{item.descricao}</p>
                  )}

                  {item.justificacao && item.justificacao !== item.descricao && (
                    <div className="rounded-[8px] bg-brand-soft/40 p-2 text-[11px] text-ink-soft">
                      <span className="font-medium text-brand">Aplicação: </span>
                      {item.justificacao}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-line/60 text-xs text-ink-soft">
                    <span>
                      Qtd:{" "}
                      <span className="font-mono font-semibold text-ink">{item.quantidade}</span>
                    </span>
                    <span>
                      {formatarMoeda(item.preco)} / {item.unidade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TOTAIS DISCRIMINADOS ("A PAGAR UMA VEZ" E "POR MÊS" COM IVA) */}
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl sm:text-2xl font-semibold tracking-tight text-ink">
            Resumo Financeiro e Investimento
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* CARTÃO: POR MÊS */}
            <div className="glass rounded-[20px] p-6 sm:p-7 border border-line flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                    <Clock className="size-3.5" />
                    Subscrição Recorrente
                  </span>
                  <span className="text-xs text-ink-soft">Cobrança mensal</span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-ink">Total Por Mês</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Serviços de subscrição contínua da loja online e apoio.
                </p>

                <div className="mt-6 space-y-2 text-sm border-t border-line pt-4">
                  <div className="flex justify-between text-ink-soft">
                    <span>Subtotal mensal (s/ IVA):</span>
                    <span className="font-mono font-medium text-ink">
                      {formatarMoeda(totais.subtotalMensal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-soft">
                    <span>IVA aplicável (23%):</span>
                    <span className="font-mono font-medium text-ink">
                      {formatarMoeda(totais.ivaMensal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-line/80 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-semibold text-ink text-sm sm:text-base">
                    A pagar por mês (c/ IVA):
                  </span>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-brand">
                    {formatarMoeda(totais.totalMensal)}
                    <span className="text-xs font-normal text-ink-soft">/mês</span>
                  </span>
                </div>
              </div>
            </div>

            {/* CARTÃO: A PAGAR UMA VEZ */}
            <div className="glass rounded-[20px] p-6 sm:p-7 border border-line flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold text-ink">
                    <CreditCard className="size-3.5" />
                    Ativação e Setup
                  </span>
                  <span className="text-xs text-ink-soft">Pagamento único</span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-ink">A Pagar Uma Vez</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Serviços pontuais de configuração, personalização e lançamento.
                </p>

                <div className="mt-6 space-y-2 text-sm border-t border-line pt-4">
                  <div className="flex justify-between text-ink-soft">
                    <span>Subtotal pontual (s/ IVA):</span>
                    <span className="font-mono font-medium text-ink">
                      {formatarMoeda(totais.subtotalPontual)}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-soft">
                    <span>IVA aplicável (23%):</span>
                    <span className="font-mono font-medium text-ink">
                      {formatarMoeda(totais.ivaPontual)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-line/80 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-semibold text-ink text-sm sm:text-base">
                    A pagar uma vez (c/ IVA):
                  </span>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-ink">
                    {formatarMoeda(totais.totalPontual)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NOTA: PEDIDOS NÃO COBERTOS */}
        {pedidosNaoCobertos && pedidosNaoCobertos.length > 0 && (
          <div className="mt-10 rounded-[20px] border border-amber-500/30 bg-amber-500/10 p-6 sm:p-7 text-ink">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                <Info className="size-5" />
              </span>
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-200">
                  Nota à parte: Necessidades fora do catálogo padrão
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Identificámos os seguintes pontos mencionados no seu pedido que não estão
                  contemplados no nosso catálogo base e serão tratados sob medida:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pt-1 text-sm text-ink">
                  {pedidosNaoCobertos.map((req, idx) => (
                    <li key={idx} className="font-medium">
                      {req}
                    </li>
                  ))}
                </ul>
                <p className="pt-2 text-xs text-ink-soft">
                  Estes requisitos adicionais podem ser orçamentados em detalhe durante a reunião
                  com o nosso especialista técnico.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CHAMADA DE AÇÃO NO FIM */}
        <div className="mt-14 glass rounded-[24px] p-8 sm:p-12 text-center border border-line shadow-sm">
          <span className="grid mx-auto size-12 place-items-center rounded-full bg-brand-soft text-brand mb-4">
            <CheckCircle2 className="size-6" />
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
            Gostaria de avançar ou esclarecer dúvidas?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-ink-soft text-pretty">
            Agende uma reunião de alinhamento de 30 minutos com a nossa equipa para rever os
            detalhes da proposta e tirar qualquer dúvida sem compromisso.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/#agendar"
              className="accent-glow w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-8 py-4 text-base font-semibold text-panel transition-all hover:bg-brand/90"
            >
              <CalendarDays className="size-5" />
              Agendar reunião
              <ArrowRight className="size-4" />
            </a>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[12px] border border-line bg-panel px-6 py-4 text-sm font-medium text-ink transition-colors hover:bg-line"
            >
              <Home className="size-4" />
              Voltar à página inicial
            </Link>
          </div>

          <p className="mt-4 text-xs text-ink-soft">
            Sem cartão de crédito. Reunião direta por videoconferência com um especialista Norte.
          </p>
        </div>
      </main>

      {/* RODAPÉ */}
      <footer className="mt-16 border-t border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-sm font-semibold text-panel">
                N
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight">Norte</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
              <Link to="/" className="transition-colors hover:text-ink">
                Página inicial
              </Link>
              <a href="/#proposta" className="transition-colors hover:text-ink">
                Pedir nova proposta
              </a>
              <a href="/#faq" className="transition-colors hover:text-ink">
                Perguntas frequentes
              </a>
            </nav>
          </div>
          <p className="mt-8 text-xs text-ink-soft/70">
            © 2026 Norte. Todos os direitos reservados. Documento de proposta comercial
            confidencial.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PropostaNotFound({ id }: { id: string }) {
  return (
    <div className="min-h-screen bg-paper font-body text-ink antialiased flex flex-col justify-between">
      {/* HEADER */}
      <header className="border-b border-line bg-panel/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <span className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-sm font-semibold text-panel">
              N
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">Norte</span>
          </Link>
        </div>
      </header>

      {/* 404 BODY */}
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <div className="glass rounded-[24px] p-8 sm:p-10 border border-line shadow-sm">
          <div className="grid mx-auto size-14 place-items-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="size-7" />
          </div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-destructive">
            Erro 404
          </span>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Proposta não encontrada
          </h1>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            A proposta comercial com a referência{" "}
            <span className="font-mono font-semibold text-ink break-all">{id}</span> não existe ou o
            identificador indicado está incorreto.
          </p>

          <div className="mt-8 flex flex-col gap-2.5">
            <Link
              to="/"
              className="accent-glow inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-5 py-3 text-sm font-semibold text-panel transition-all hover:bg-brand/90"
            >
              <Home className="size-4" />
              Voltar à página inicial
            </Link>
            <a
              href="/#proposta"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-line bg-panel px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-line"
            >
              Pedir nova proposta
            </a>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line bg-panel/40 py-8 text-center text-xs text-ink-soft">
        <p>© 2026 Norte. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
