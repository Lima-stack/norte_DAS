import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { criarPedidoProposta } from "@/lib/proposta.functions";
import type { Proposta } from "@/lib/proposta.server";

export function PedidoPropostaForm() {
  const submitFn = useServerFn(criarPedidoProposta);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [pedido, setPedido] = useState("");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{
    propostaId: string;
    pedidoId: string;
    proposta?: Proposta;
    mensagem: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    const pedidoTrim = pedido.trim();

    if (!nomeTrim) {
      setErro("Por favor, introduza o seu nome.");
      return;
    }
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setErro("Por favor, introduza um e-mail válido.");
      return;
    }
    if (pedidoTrim.length < 5) {
      setErro("Por favor, descreva o que procura com pelo menos 5 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await submitFn({
        data: {
          nome: nomeTrim,
          email: emailTrim,
          pedido: pedidoTrim,
        },
      });

      if (res.ok) {
        setSucesso({
          propostaId: res.propostaId,
          pedidoId: res.pedidoId,
          proposta: res.proposta,
          mensagem: res.mensagem,
        });
      } else {
        // Se a chamada ao Gemini falhou, o pedido fica guardado como recebido
        setErro(res.error || "Ocorreu um erro ao processar o seu pedido.");
        if (res.pedidoId) {
          // O pedido foi guardado
          setSucesso({
            propostaId: "",
            pedidoId: res.pedidoId,
            mensagem:
              "O seu pedido foi recebido com sucesso. Iremos analisá-lo e enviar a proposta por e-mail.",
          });
        }
      }
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Erro de comunicação ao submeter o pedido. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSucesso(null);
    setErro(null);
    setNome("");
    setEmail("");
    setPedido("");
  };

  const fmtPreco = (val: number) =>
    new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  return (
    <div className="glass rounded-[24px] p-6 sm:p-10 shadow-[var(--glass-shadow)] transition-all">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-[12px] bg-brand text-panel shadow-[var(--accent-glow)]">
            <FileText className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Pedido de proposta
            </h3>
            <p className="text-sm text-ink-soft">
              Receba um orçamento detalhado com base no nosso catálogo oficial
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
          <Sparkles className="size-3.5" /> Orçamento instantâneo
        </span>
      </div>

      {erro && (
        <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <p className="flex-1 leading-relaxed">{erro}</p>
        </div>
      )}

      {sucesso ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-[16px] border border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/20 p-5 text-emerald-800 dark:text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-base">{sucesso.mensagem}</h4>
                <p className="text-xs opacity-90">
                  Identificador do pedido:{" "}
                  <span className="font-mono font-semibold">{sucesso.pedidoId}</span>
                  {sucesso.propostaId && (
                    <>
                      {" "}
                      · Referência da proposta:{" "}
                      <span className="font-mono font-semibold">{sucesso.propostaId}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {sucesso.propostaId && (
              <a
                href={`/proposta/${sucesso.propostaId}`}
                className="accent-glow inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-brand px-4 py-2.5 text-sm font-semibold text-panel shadow-sm transition-all hover:bg-brand/90"
              >
                Ver proposta
                <ArrowRight className="size-4" />
              </a>
            )}
          </div>

          {sucesso.proposta && (
            <div className="rounded-[18px] border border-line bg-panel/90 p-5 sm:p-7 shadow-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Resumo da Proposta
                </p>
                <p className="mt-1.5 font-display text-lg font-medium text-ink leading-relaxed">
                  {sucesso.proposta.resumo}
                </p>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Serviços Recomendados
                </p>
                <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                  {sucesso.proposta.itens.map((item) => (
                    <div
                      key={item.catalogoId}
                      className="p-4 bg-paper/50 hover:bg-paper transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <span className="font-display font-semibold text-ink text-[15px]">
                            {item.nome}
                          </span>
                          <span className="ml-2 text-xs text-ink-soft">
                            ({item.quantidade}x {fmtPreco(item.preco)} / {item.unidade})
                          </span>
                        </div>
                        <span className="font-display font-semibold text-brand text-base">
                          {fmtPreco(item.subtotal)}
                        </span>
                      </div>
                      {item.justificacao && (
                        <p className="mt-1 text-xs text-ink-soft/90 leading-relaxed">
                          {item.justificacao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {sucesso.proposta.pedidosNaoCobertos &&
                sucesso.proposta.pedidosNaoCobertos.length > 0 && (
                  <div className="rounded-[12px] bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-ink">
                    <p className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300 mb-1">
                      <Info className="size-3.5" /> Pedidos especiais fora do catálogo base:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-ink-soft">
                      {sucesso.proposta.pedidosNaoCobertos.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-ink-soft">
                      A nossa equipa entrará em contacto para orçamentar estas especificidades sob
                      medida.
                    </p>
                  </div>
                )}

              {/* Totais com cálculo do código */}
              <div className="border-t border-line pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <span>Subtotal (s/ IVA):</span>
                  <span className="font-mono font-medium">
                    {fmtPreco(sucesso.proposta.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>IVA (23%):</span>
                  <span className="font-mono font-medium">{fmtPreco(sucesso.proposta.iva)}</span>
                </div>
                <div className="flex justify-between text-base sm:text-lg font-display font-bold text-ink border-t border-line/60 pt-2">
                  <span>Total (c/ IVA):</span>
                  <span className="text-brand">{fmtPreco(sucesso.proposta.total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-[12px] border border-line bg-panel px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-line"
            >
              <RefreshCw className="size-4" />
              Submeter outro pedido
            </button>
            {sucesso.propostaId && (
              <a
                href={`/proposta/${sucesso.propostaId}`}
                className="accent-glow inline-flex items-center gap-2 rounded-[12px] bg-brand px-5 py-2.5 text-sm font-semibold text-panel shadow-sm transition-all hover:bg-brand/90"
              >
                Ver proposta completa
                <ArrowRight className="size-4" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="proposta-nome"
                className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase"
              >
                Nome ou Empresa *
              </label>
              <input
                id="proposta-nome"
                type="text"
                required
                maxLength={100}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: Marta Silva"
                className="w-full rounded-[12px] border border-line bg-panel px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="proposta-email"
                className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase"
              >
                E-mail para resposta *
              </label>
              <input
                id="proposta-email"
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex.: marta@minhaloja.pt"
                className="w-full rounded-[12px] border border-line bg-panel px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="proposta-pedido"
              className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase"
            >
              O que pretende para a sua loja? *
            </label>
            <textarea
              id="proposta-pedido"
              required
              rows={4}
              maxLength={2000}
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              placeholder="Descreva as suas necessidades: ex. Quero abrir uma loja online de cerâmica com temas personalizados, venda em redes sociais e suporte prioritário..."
              className="w-full rounded-[12px] border border-line bg-panel px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none resize-y"
            />
            <p className="mt-1 text-right text-[11px] text-ink-soft">
              {pedido.length}/2000 caracteres
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <p className="text-xs text-ink-soft/80">
              Cálculo transparente com IVA incluído a 23%. Sem compromisso.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="accent-glow inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-6 py-3.5 text-sm font-semibold text-panel transition-all hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />A gerar proposta com IA…
                </>
              ) : (
                <>
                  Pedir proposta
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
