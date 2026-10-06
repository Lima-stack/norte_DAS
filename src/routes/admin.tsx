import { useEffect, useState, useMemo, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  ShieldAlert,
  LogOut,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  User as UserIcon,
  Home,
  Check,
  Copy,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { obterAdminConfig } from "@/lib/admin.functions";
import type { PropostaAdminRow } from "@/lib/admin.server";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const config = await obterAdminConfig();
    return { adminEmail: config.adminEmail };
  },
  head: () => ({
    meta: [{ title: "Painel de Administração | Norte" }],
  }),
  component: AdminPage,
});

type EstadoFiltro = "todos" | "recebido" | "gerada" | "enviada" | "erro_email";

function formatarDataHora(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

function AdminPage() {
  const { adminEmail } = Route.useLoaderData();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [propostas, setPropostas] = useState<PropostaAdminRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");
  const [busca, setBusca] = useState("");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Monitorizar estado de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(false);
      setAuthError(null);

      if (user) {
        const email = user.email?.trim().toLowerCase();
        const expected = adminEmail.trim().toLowerCase();

        if (email === expected) {
          setCurrentUser(user);
        } else {
          // Utilizador não autorizado
          await signOut(auth);
          setCurrentUser(null);
          setAuthError(
            `Acesso restrito. A conta Google (${user.email}) não está autorizada como administrador.`,
          );
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, [adminEmail]);

  // Carregar lista de propostas quando o administrador estiver autenticado
  const carregarDados = useCallback(async () => {
    if (!currentUser?.email) return;
    setDataLoading(true);
    setDataError(null);

    try {
      // 1. Ler pedidos diretamente do Firestore (permitido pela regra isAdmin())
      const pedidosSnap = await getDocs(collection(db, "pedidos"));
      const pedidosMap = new Map<
        string,
        {
          nome?: string;
          email?: string;
          pedido?: string;
          criadoEm?: string;
          estado?: string;
        }
      >();
      for (const d of pedidosSnap.docs) {
        pedidosMap.set(d.id, d.data());
      }

      // 2. Ler propostas diretamente do Firestore (permitido pela regra isAdmin())
      const propostasSnap = await getDocs(collection(db, "propostas"));
      const rows: PropostaAdminRow[] = [];
      const propostasPorPedido = new Set<string>();

      for (const d of propostasSnap.docs) {
        const prop = d.data();
        const ped = prop.pedidoId ? pedidosMap.get(prop.pedidoId) : undefined;
        if (prop.pedidoId) {
          propostasPorPedido.add(prop.pedidoId);
        }

        const nomeCliente = (prop.nomeCliente || ped?.nome || "Cliente").trim();
        const emailCliente = (prop.clienteEmail || ped?.email || "").trim();
        const data = prop.criadoEm || ped?.criadoEm || new Date().toISOString();
        const link = prop.link || `/proposta/${prop.id}`;

        let subtotalMensal = 0;
        let subtotalPontual = 0;
        if (Array.isArray(prop.itens)) {
          for (const item of prop.itens) {
            const u = (item.unidade || "").toLowerCase();
            if (u.includes("mês") || u.includes("mes") || u === "mensal") {
              subtotalMensal += Number(item.subtotal) || 0;
            } else {
              subtotalPontual += Number(item.subtotal) || 0;
            }
          }
        }

        const totalMensal = Number((subtotalMensal * 1.23).toFixed(2));
        const totalPontual = Number((subtotalPontual * 1.23).toFixed(2));

        rows.push({
          id: prop.id,
          pedidoId: prop.pedidoId || "",
          data,
          nomeCliente,
          emailCliente,
          resumo: prop.resumo || "",
          subtotal: Number(prop.subtotal) || 0,
          iva: Number(prop.iva) || 0,
          total: Number(prop.total) || 0,
          totalMensal: totalMensal > 0 ? totalMensal : undefined,
          totalPontual: totalPontual > 0 ? totalPontual : undefined,
          estado: prop.estado || "gerada",
          link,
          erroEmail: prop.erroEmail,
          itensCount: Array.isArray(prop.itens) ? prop.itens.length : 0,
        });
      }

      // 3. Incluir pedidos com estado "recebido" que ainda não geraram proposta
      for (const [pedId, ped] of pedidosMap.entries()) {
        if (!propostasPorPedido.has(pedId) && ped.estado === "recebido") {
          rows.push({
            id: pedId,
            pedidoId: pedId,
            data: ped.criadoEm || new Date().toISOString(),
            nomeCliente: ped.nome || "Cliente",
            emailCliente: ped.email || "",
            resumo: ped.pedido || "",
            subtotal: 0,
            iva: 0,
            total: 0,
            estado: "recebido",
            link: "",
            itensCount: 0,
          });
        }
      }

      // 4. Ordenar da mais recente para a mais antiga
      rows.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setPropostas(rows);
    } catch (err) {
      console.error("[Admin] Erro ao carregar propostas do Firestore:", err);
      setDataError(
        err instanceof Error
          ? err.message
          : "Erro ao comunicar com a base de dados. Verifique as permissões de administrador.",
      );
    } finally {
      setDataLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (currentUser) {
      carregarDados();
    }
  }, [currentUser, carregarDados]);

  // Login com Google
  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);

      const email = result.user.email?.trim().toLowerCase();
      const expected = adminEmail.trim().toLowerCase();

      if (email !== expected) {
        await signOut(auth);
        setAuthError(
          `Acesso não autorizado. A conta Google (${result.user.email}) não corresponde ao administrador (${adminEmail}).`,
        );
      }
    } catch (err: unknown) {
      console.error("[Admin] Erro no login Google:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("popup-closed-by-user")) {
        setAuthError("Não foi possível concluir o login com o Google.");
      }
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setPropostas([]);
  };

  const handleCopiarLink = (link: string, id: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // Filtros de pesquisa e estado
  const propostasFiltradas = useMemo(() => {
    return propostas.filter((row) => {
      // Filtro de estado
      if (filtroEstado !== "todos" && row.estado !== filtroEstado) {
        return false;
      }

      // Filtro de pesquisa de texto
      if (busca.trim()) {
        const query = busca.toLowerCase();
        const nome = row.nomeCliente.toLowerCase();
        const email = row.emailCliente.toLowerCase();
        const resumo = row.resumo.toLowerCase();
        const id = row.id.toLowerCase();
        return (
          nome.includes(query) ||
          email.includes(query) ||
          resumo.includes(query) ||
          id.includes(query)
        );
      }

      return true;
    });
  }, [propostas, filtroEstado, busca]);

  // Contadores de estado
  const contadores = useMemo(() => {
    const c = {
      todos: propostas.length,
      recebido: 0,
      gerada: 0,
      enviada: 0,
      erro_email: 0,
    };
    for (const p of propostas) {
      if (p.estado in c) {
        c[p.estado]++;
      }
    }
    return c;
  }, [propostas]);

  // 1. Estado de Carregamento Inicial de Autenticação
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-brand" />
          <p className="text-sm font-medium text-ink-soft">A verificar sessão de administrador…</p>
        </div>
      </div>
    );
  }

  // 2. Estado Não Autenticado: Ecrã de Login
  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-paper font-body text-ink antialiased">
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

        <main className="mx-auto w-full max-w-md px-5 py-16">
          <div className="glass rounded-[24px] p-8 sm:p-10 border border-line shadow-[var(--glass-shadow)] text-center">
            <div className="grid mx-auto size-14 place-items-center rounded-[14px] bg-ink text-panel mb-5">
              <span className="font-display text-2xl font-bold">N</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Administração Norte
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Acesso restrito ao e-mail autorizado:{" "}
              <span className="font-mono text-xs font-semibold text-ink">{adminEmail}</span>
            </p>

            {authError && (
              <div className="mt-6 flex items-start gap-2.5 rounded-[12px] border border-destructive/30 bg-destructive/10 p-3.5 text-left text-xs text-destructive">
                <ShieldAlert className="size-5 shrink-0" />
                <p className="leading-relaxed">{authError}</p>
              </div>
            )}

            <div className="mt-8">
              <button
                onClick={handleGoogleLogin}
                className="w-full inline-flex items-center justify-center gap-3 rounded-[12px] border border-line bg-panel px-5 py-3.5 text-sm font-semibold text-ink shadow-sm transition-all hover:bg-line/80 focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {/* Ícone oficial Google */}
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Iniciar sessão com Google
              </button>
            </div>

            <div className="mt-6 border-t border-line/70 pt-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors"
              >
                <Home className="size-3.5" />
                Voltar à página pública
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t border-line bg-panel/40 py-6 text-center text-xs text-ink-soft">
          © 2026 Norte. Painel de Controlo Interno.
        </footer>
      </div>
    );
  }

  // 3. Estado Autenticado: Painel de Controlo
  return (
    <div className="min-h-screen bg-paper font-body text-ink antialiased selection:bg-brand/20">
      {/* BARRA SUPERIOR DO ADMIN */}
      <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-sm font-semibold text-panel">
                  N
                </span>
                <span className="font-display text-base font-semibold tracking-tight">Norte</span>
              </Link>
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
                Backoffice
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-ink">{currentUser.email}</span>
              </div>

              <button
                onClick={carregarDados}
                disabled={dataLoading}
                title="Recarregar dados"
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-line disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${dataLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
              >
                <LogOut className="size-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO PAINEL */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Gestão de Propostas e Pedidos
            </h1>
            <p className="text-sm text-ink-soft mt-1">
              Visão geral de todas as propostas emitidas, da mais recente para a mais antiga.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors"
          >
            <Home className="size-3.5" />
            Ver website público
          </Link>
        </div>

        {dataError && (
          <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p className="leading-relaxed flex-1">{dataError}</p>
            <button
              onClick={carregarDados}
              className="text-xs underline hover:no-underline font-medium"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* BARRA DE FILTROS E PESQUISA */}
        <div className="glass rounded-[20px] p-4 sm:p-5 border border-line shadow-sm mb-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Pílulas de filtro por estado */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-soft flex items-center gap-1 mr-1">
                <Filter className="size-3.5" /> Estado:
              </span>
              <button
                onClick={() => setFiltroEstado("todos")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroEstado === "todos"
                    ? "bg-ink text-panel shadow-sm"
                    : "bg-paper text-ink-soft hover:text-ink hover:bg-line"
                }`}
              >
                Todos ({contadores.todos})
              </button>
              <button
                onClick={() => setFiltroEstado("enviada")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroEstado === "enviada"
                    ? "bg-emerald-600 text-panel shadow-sm"
                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                }`}
              >
                Enviadas ({contadores.enviada})
              </button>
              <button
                onClick={() => setFiltroEstado("gerada")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroEstado === "gerada"
                    ? "bg-indigo-600 text-panel shadow-sm"
                    : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100"
                }`}
              >
                Geradas ({contadores.gerada})
              </button>
              <button
                onClick={() => setFiltroEstado("recebido")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroEstado === "recebido"
                    ? "bg-amber-600 text-panel shadow-sm"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                }`}
              >
                Recebidas ({contadores.recebido})
              </button>
              <button
                onClick={() => setFiltroEstado("erro_email")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroEstado === "erro_email"
                    ? "bg-rose-600 text-panel shadow-sm"
                    : "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100"
                }`}
              >
                Erro de Email ({contadores.erro_email})
              </button>
            </div>

            {/* Campo de pesquisa */}
            <div className="relative min-w-[240px] md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-soft/70" />
              <input
                type="text"
                placeholder="Pesquisar por nome, email ou ref..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-[10px] border border-line bg-panel pl-9 pr-4 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* TABELA DE PROPOSTAS */}
        <div className="overflow-hidden rounded-[20px] border border-line bg-panel shadow-sm">
          {dataLoading && propostas.length === 0 ? (
            <div className="p-16 text-center">
              <RefreshCw className="size-7 animate-spin mx-auto text-brand mb-2" />
              <p className="text-sm text-ink-soft">A carregar histórico de propostas…</p>
            </div>
          ) : propostasFiltradas.length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="size-10 mx-auto text-ink-soft/50 mb-3" />
              <h3 className="font-display font-semibold text-ink text-base">
                Nenhuma proposta encontrada
              </h3>
              <p className="text-xs text-ink-soft mt-1">
                {busca || filtroEstado !== "todos"
                  ? "Tente alterar os filtros ou o termo de pesquisa."
                  : "Ainda não foram submetidos pedidos de proposta na plataforma."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper/70 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                    <th scope="col" className="px-5 py-3.5">
                      Data
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Cliente
                    </th>
                    <th scope="col" className="px-5 py-3.5 min-w-[260px]">
                      Resumo do Pedido
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right">
                      Totais
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-center">
                      Estado
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right">
                      Link da Proposta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {propostasFiltradas.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-paper/40 align-top">
                      {/* 1. DATA */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-ink-soft font-mono">
                        <div className="flex items-center gap-1.5 font-medium text-ink">
                          <Clock className="size-3 text-ink-soft" />
                          {formatarDataHora(row.data)}
                        </div>
                        <span className="block text-[10px] text-ink-soft/70 mt-0.5">
                          #{row.id.slice(0, 16)}…
                        </span>
                      </td>

                      {/* 2. NOME E EMAIL DO CLIENTE */}
                      <td className="px-5 py-4 min-w-[180px]">
                        <div className="font-display font-semibold text-ink flex items-center gap-1.5">
                          <UserIcon className="size-3.5 text-brand" />
                          {row.nomeCliente}
                        </div>
                        {row.emailCliente ? (
                          <a
                            href={`mailto:${row.emailCliente}`}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline font-mono"
                          >
                            <Mail className="size-3 text-ink-soft" />
                            {row.emailCliente}
                          </a>
                        ) : (
                          <span className="text-[11px] text-ink-soft/60">Sem e-mail</span>
                        )}
                      </td>

                      {/* 3. RESUMO DO PEDIDO */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-ink leading-relaxed line-clamp-3">
                          {row.resumo || "Sem descrição disponível."}
                        </p>
                        {row.itensCount > 0 && (
                          <span className="mt-1.5 inline-block text-[10px] font-semibold text-ink-soft uppercase tracking-wider">
                            {row.itensCount} {row.itensCount === 1 ? "serviço" : "serviços"}
                          </span>
                        )}
                      </td>

                      {/* 4. TOTAIS */}
                      <td className="px-5 py-4 text-right whitespace-nowrap font-mono">
                        {row.total > 0 ? (
                          <>
                            <span className="font-bold text-ink text-sm block">
                              {formatarMoeda(row.total)}
                            </span>
                            <span className="text-[10px] text-ink-soft block">
                              s/ IVA: {formatarMoeda(row.subtotal)}
                            </span>
                            {row.totalMensal && (
                              <span className="text-[10px] text-brand block">
                                {formatarMoeda(row.totalMensal)}/mês
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-ink-soft">A orçamentar</span>
                        )}
                      </td>

                      {/* 5. ESTADO */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <BadgeEstado estado={row.estado} erroEmail={row.erroEmail} />
                      </td>

                      {/* 6. LINK DA PROPOSTA */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {row.link ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopiarLink(row.link, row.id)}
                              title="Copiar link da proposta"
                              className="rounded-[8px] border border-line bg-paper p-1.5 text-ink-soft hover:text-ink hover:bg-line transition-colors"
                            >
                              {copiadoId === row.id ? (
                                <Check className="size-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-[8px] bg-brand/10 hover:bg-brand/20 px-2.5 py-1 text-xs font-semibold text-brand transition-colors"
                            >
                              <span>Ver</span>
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-soft/70">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function BadgeEstado({
  estado,
  erroEmail,
}: {
  estado: PropostaAdminRow["estado"];
  erroEmail?: string;
}) {
  switch (estado) {
    case "enviada":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold">
          <CheckCircle2 className="size-3" />
          Enviada
        </span>
      );
    case "gerada":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 text-xs font-semibold">
          <Clock className="size-3" />
          Gerada
        </span>
      );
    case "erro_email":
      return (
        <span
          title={erroEmail || "Ocorreu uma falha no envio do email"}
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 px-2.5 py-1 text-xs font-semibold cursor-help"
        >
          <AlertCircle className="size-3" />
          Erro de Email
        </span>
      );
    case "recebido":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 text-xs font-semibold">
          <Clock className="size-3" />
          Recebido
        </span>
      );
  }
}
