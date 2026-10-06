import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Proposta, Pedido } from "./proposta.server";

export interface PropostaAdminRow {
  id: string;
  pedidoId: string;
  data: string;
  nomeCliente: string;
  emailCliente: string;
  resumo: string;
  subtotal: number;
  iva: number;
  total: number;
  totalMensal?: number;
  totalPontual?: number;
  estado: "recebido" | "gerada" | "enviada" | "erro_email";
  link: string;
  erroEmail?: string;
  itensCount: number;
}

/**
 * Retorna o e-mail do administrador configurado em ADMIN_EMAIL secret.
 */
export function getAdminEmail(): string {
  const envAdmin = process.env.ADMIN_EMAIL?.trim();
  if (envAdmin) return envAdmin;
  return "Mipaclima@gmail.com";
}

/**
 * Carrega todas as propostas e pedidos no servidor para exibição no painel de administração:
 * - Ordenadas da mais recente para a mais antiga.
 * - Inclui data, nome, email do cliente, resumo, totais, estado e link.
 * - Junta os dados de "pedidos" para garantir que o e-mail do cliente está sempre presente.
 */
export async function listarPropostasAdmin(): Promise<PropostaAdminRow[]> {
  try {
    const rawAppUrl =
      process.env.APP_URL ||
      "https://ais-dev-4kxra4ukeqf6sfctppu3no-806486718432.europe-west2.run.app";
    const baseUrl = rawAppUrl.replace(/\/+$/, "");

    // 1. Ler pedidos para ter mapa de clientes (nome, email)
    const pedidosSnap = await getDocs(collection(db, "pedidos"));
    const pedidosMap = new Map<string, Pedido>();
    for (const d of pedidosSnap.docs) {
      pedidosMap.set(d.id, d.data() as Pedido);
    }

    // 2. Ler propostas
    const propostasSnap = await getDocs(collection(db, "propostas"));
    const rows: PropostaAdminRow[] = [];
    const propostasPorPedido = new Set<string>();

    for (const d of propostasSnap.docs) {
      const prop = d.data() as Proposta;
      const ped = prop.pedidoId ? pedidosMap.get(prop.pedidoId) : undefined;
      if (prop.pedidoId) {
        propostasPorPedido.add(prop.pedidoId);
      }

      const nomeCliente = (prop.nomeCliente || ped?.nome || "Cliente").trim();
      const emailCliente = (prop.clienteEmail || ped?.email || "").trim();
      const data = prop.criadoEm || ped?.criadoEm || new Date().toISOString();
      const link = prop.link || `${baseUrl}/proposta/${prop.id}`;

      // Calcular totais mensal vs pontual se existirem itens
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
        estado: (prop.estado as PropostaAdminRow["estado"]) || "gerada",
        link,
        erroEmail: prop.erroEmail,
        itensCount: Array.isArray(prop.itens) ? prop.itens.length : 0,
      });
    }

    // 3. Adicionar pedidos que ficaram no estado "recebido" (sem proposta gerada)
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

    return rows;
  } catch (err) {
    console.error("[Admin Server] Erro ao listar propostas:", err);
    return [];
  }
}
