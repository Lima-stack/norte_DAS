import { collection, doc, getDocs, setDoc, getDoc } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./firebase";
import { seedCatalogoIfEmpty, type CatalogoItem } from "./catalogo.server";
import { enviarEmailProposta } from "./email.server";

export interface SubmeterPedidoInput {
  nome: string;
  email: string;
  pedido: string;
}

export interface PropostaItem {
  catalogoId: string;
  nome: string;
  descricao?: string;
  preco: number;
  unidade: string;
  quantidade: number;
  justificacao: string;
  subtotal: number;
}

export interface Proposta {
  id: string;
  pedidoId: string;
  nomeCliente?: string;
  clienteEmail?: string;
  resumo: string;
  itens: PropostaItem[];
  pedidosNaoCobertos: string[];
  subtotal: number;
  taxaIva: number;
  iva: number;
  total: number;
  estado: "gerada" | "enviada" | "erro_email";
  dataEnvio?: string;
  link?: string;
  erroEmail?: string;
  criadoEm: string;
}

export interface PropostaPublicaItem {
  catalogoId: string;
  nome: string;
  descricao: string;
  preco: number;
  unidade: string;
  quantidade: number;
  justificacao: string;
  subtotal: number;
}

export interface PropostaPublicaTotais {
  subtotalMensal: number;
  ivaMensal: number;
  totalMensal: number;
  subtotalPontual: number;
  ivaPontual: number;
  totalPontual: number;
  subtotalGeral: number;
  ivaGeral: number;
  totalGeral: number;
}

export interface PropostaPublica {
  id: string;
  nomeCliente: string;
  criadoEm: string;
  resumo: string;
  itens: PropostaPublicaItem[];
  pedidosNaoCobertos: string[];
  totais: PropostaPublicaTotais;
  estado?: "gerada" | "enviada" | "erro_email";
  dataEnvio?: string;
  link?: string;
}

export interface Pedido {
  id: string;
  nome: string;
  email: string;
  pedido: string;
  estado: "recebido" | "proposta gerada";
  criadoEm: string;
  propostaId?: string;
  atualizadoEm?: string;
}

export type SubmeterPedidoResponse =
  | {
      ok: true;
      propostaId: string;
      pedidoId: string;
      proposta: Proposta;
      mensagem: string;
    }
  | {
      ok: false;
      pedidoId?: string;
      error: string;
    };

/**
 * Processa a submissão de um pedido de proposta no servidor:
 * 1. Valida nome, email e pedido, e guarda o pedido na coleção "pedidos" com estado "recebido" e a data.
 * 2. Lê os serviços ativos da coleção "catalogo".
 * 3. Chama a API do Gemini (Flash, GEMINI_API_KEY) com schema fixo em JSON.
 * 4. No código (não no modelo), descarta IDs inválidos, busca os preços e calcula subtotal, IVA (23%) e total.
 * 5. Guarda o resultado na coleção "propostas" e atualiza o pedido para "proposta gerada".
 * 6. Devolve ao frontend o ID da proposta.
 */
export async function submeterPedido(input: SubmeterPedidoInput): Promise<SubmeterPedidoResponse> {
  // 1. Validação de dados de entrada
  const nome = (input.nome ?? "").trim();
  const email = (input.email ?? "").trim();
  const pedidoTexto = (input.pedido ?? "").trim();

  if (!nome || nome.length < 2 || nome.length > 100) {
    return { ok: false, error: "Por favor, indique um nome válido (2 a 100 caracteres)." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 255) {
    return { ok: false, error: "Por favor, indique um endereço de e-mail válido." };
  }

  if (!pedidoTexto || pedidoTexto.length < 5 || pedidoTexto.length > 2000) {
    return {
      ok: false,
      error: "Por favor, descreva o seu pedido com pelo menos 5 caracteres (máximo 2000).",
    };
  }

  // 1. Guarda o pedido na coleção "pedidos" com estado "recebido" e a data
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const pedidoId = `ped_${timestamp}_${randomSuffix}`;
  const dataCriacao = new Date().toISOString();

  const SERVER_INTERNAL_TOKEN = "norte_srv_key_2026";

  const pedidoData: Pedido = {
    id: pedidoId,
    nome,
    email,
    pedido: pedidoTexto,
    estado: "recebido",
    criadoEm: dataCriacao,
  };

  try {
    await setDoc(doc(db, "pedidos", pedidoId), {
      ...pedidoData,
      _srvToken: SERVER_INTERNAL_TOKEN,
    });
  } catch (err) {
    console.error("[Proposta Server] Erro ao guardar pedido no Firestore:", err);
    return {
      ok: false,
      error: "Não foi possível registar o seu pedido. Por favor, tente novamente.",
    };
  }

  // 2. Lê os serviços ativos da coleção "catalogo"
  let servicosAtivos: CatalogoItem[] = [];
  try {
    await seedCatalogoIfEmpty();
    const catalogoSnap = await getDocs(collection(db, "catalogo"));
    servicosAtivos = catalogoSnap.docs
      .map((d) => d.data() as CatalogoItem)
      .filter((item) => item.ativo !== false);
  } catch (err) {
    console.error("[Proposta Server] Erro ao ler serviços do catálogo:", err);
  }

  if (servicosAtivos.length === 0) {
    return {
      ok: false,
      pedidoId,
      error:
        "O seu pedido foi registado (estado: recebido). A tabela de serviços está temporariamente indisponível para gerar o orçamento de imediato.",
    };
  }

  // 3. Chama a API do Gemini (modelo Flash, chave GEMINI_API_KEY no servidor)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Proposta Server] GEMINI_API_KEY não configurada no servidor.");
    return {
      ok: false,
      pedidoId,
      error:
        "O seu pedido foi registado (estado: recebido). O serviço de geração automática de propostas está temporariamente indisponível.",
    };
  }

  interface GeminiResponseSchema {
    resumo: string;
    itens: Array<{
      catalogoId: string;
      quantidade: number;
      justificacao: string;
    }>;
    pedidosNaoCobertos: string[];
  }

  let geminiOutput: GeminiResponseSchema;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const listaServicosTexto = servicosAtivos
      .map(
        (s) =>
          `- ID: "${s.id}" | Nome: "${s.nome}" | Preço: ${s.preco}€ por ${s.unidade} | Descrição: "${s.descricao}"`,
      )
      .join("\n");

    const prompt = `Analisa o seguinte pedido de proposta de um cliente para a plataforma Norte e seleciona os serviços mais indicados do catálogo oficial:

DADOS DO CLIENTE:
Nome: ${nome}
E-mail: ${email}
Descrição do Pedido:
"${pedidoTexto}"

CATÁLOGO DE SERVIÇOS DISPONÍVEIS:
${listaServicosTexto}

INSTRUÇÕES OBRIGATÓRIAS:
1. Só podes usar IDs que existam exatamente na lista de catálogo acima.
2. Não inventes novos IDs nem alteres os preços.
3. Se o cliente tiver necessidades ou pedidos que nenhum serviço do catálogo cubra, lista-os em "pedidosNaoCobertos".
4. Elabora um resumo claro e executivo do pedido do cliente em "resumo".
5. Para cada serviço selecionado, indica a quantidade recomendada (número inteiro >= 1) e uma justificação concisa em português.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction:
            "És o especialista em propostas comerciais da Norte. Analisa as necessidades com rigor e recomenda apenas os serviços existentes no catálogo que correspondam ao que o cliente precisa.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumo: {
                type: Type.STRING,
                description: "Resumo executivo em português das necessidades do cliente",
              },
              itens: {
                type: Type.ARRAY,
                description: "Lista de itens recomendados do catálogo",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    catalogoId: {
                      type: Type.STRING,
                      description: "ID do serviço presente no catálogo fornecido",
                    },
                    quantidade: {
                      type: Type.INTEGER,
                      description: "Quantidade inteira necessária (mínimo 1)",
                    },
                    justificacao: {
                      type: Type.STRING,
                      description: "Justificação para a inclusão deste item na proposta",
                    },
                  },
                  required: ["catalogoId", "quantidade", "justificacao"],
                },
              },
              pedidosNaoCobertos: {
                type: Type.ARRAY,
                description: "Pedidos que o catálogo atual não cobre",
                items: {
                  type: Type.STRING,
                },
              },
            },
            required: ["resumo", "itens", "pedidosNaoCobertos"],
          },
        },
      });
    } catch (primaryErr) {
      console.warn(
        "[Proposta Server] gemini-flash-latest falhou, a tentar modelo alternativo Flash...",
        primaryErr,
      );
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction:
            "És o especialista em propostas comerciais da Norte. Analisa as necessidades com rigor e recomenda apenas os serviços existentes no catálogo que correspondam ao que o cliente precisa.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumo: {
                type: Type.STRING,
                description: "Resumo executivo em português das necessidades do cliente",
              },
              itens: {
                type: Type.ARRAY,
                description: "Lista de itens recomendados do catálogo",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    catalogoId: {
                      type: Type.STRING,
                      description: "ID do serviço presente no catálogo fornecido",
                    },
                    quantidade: {
                      type: Type.INTEGER,
                      description: "Quantidade inteira necessária (mínimo 1)",
                    },
                    justificacao: {
                      type: Type.STRING,
                      description: "Justificação para a inclusão deste item na proposta",
                    },
                  },
                  required: ["catalogoId", "quantidade", "justificacao"],
                },
              },
              pedidosNaoCobertos: {
                type: Type.ARRAY,
                description: "Pedidos que o catálogo atual não cobre",
                items: {
                  type: Type.STRING,
                },
              },
            },
            required: ["resumo", "itens", "pedidosNaoCobertos"],
          },
        },
      });
    }

    const rawText = response.text?.trim() ?? "{}";
    geminiOutput = JSON.parse(rawText) as GeminiResponseSchema;
  } catch (geminiError) {
    console.error("[Proposta Server] Erro ao chamar a API Gemini:", geminiError);
    // Se a chamada ao Gemini falhar, o pedido fica guardado como "recebido" e o utilizador vê uma mensagem de erro simples.
    return {
      ok: false,
      pedidoId,
      error:
        "O seu pedido foi recebido com sucesso com a referência " +
        pedidoId +
        ", mas ocorreu uma falha ao gerar a proposta automática. A nossa equipa irá analisá-lo brevemente.",
    };
  }

  // 4. No código, e não no modelo, descarta IDs inválidos, obtém preço do catálogo e calcula subtotal, IVA (23%) e total.
  const catalogoMap = new Map<string, CatalogoItem>(servicosAtivos.map((s) => [s.id, s]));

  const itensCalculados: PropostaItem[] = [];
  const rawItems = Array.isArray(geminiOutput.itens) ? geminiOutput.itens : [];

  for (const item of rawItems) {
    if (!item?.catalogoId) continue;
    const servico = catalogoMap.get(item.catalogoId);
    if (!servico) {
      console.warn(
        `[Proposta Server] ID descartado por não existir no catálogo: "${item.catalogoId}"`,
      );
      continue;
    }

    const quantidade = Math.max(1, Math.round(Number(item.quantidade) || 1));
    const preco = Number(servico.preco);
    const subtotalItem = Number((preco * quantidade).toFixed(2));

    itensCalculados.push({
      catalogoId: servico.id,
      nome: servico.nome,
      descricao: servico.descricao,
      preco,
      unidade: servico.unidade,
      quantidade,
      justificacao: (item.justificacao ?? "").trim(),
      subtotal: subtotalItem,
    });
  }

  // Se nenhum item foi validado, incluir o Plano Starter por omissão
  if (itensCalculados.length === 0 && catalogoMap.has("plano-starter")) {
    const starter = catalogoMap.get("plano-starter")!;
    itensCalculados.push({
      catalogoId: starter.id,
      nome: starter.nome,
      descricao: starter.descricao,
      preco: starter.preco,
      unidade: starter.unidade,
      quantidade: 1,
      justificacao: "Plano base recomendado para lançamento da loja online.",
      subtotal: starter.preco,
    });
  }

  const subtotal = Number(itensCalculados.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
  const taxaIva = 0.23;
  const iva = Number((subtotal * taxaIva).toFixed(2));
  const total = Number((subtotal + iva).toFixed(2));

  // 5. Guarda o resultado na coleção "propostas" e atualiza o estado do pedido para "proposta gerada"
  const propostaId = `prop_${timestamp}_${randomSuffix}`;
  const propostaData: Proposta = {
    id: propostaId,
    pedidoId,
    nomeCliente: nome,
    clienteEmail: email,
    resumo: geminiOutput.resumo?.trim() || "Proposta personalizada para a loja online Norte.",
    itens: itensCalculados,
    pedidosNaoCobertos: Array.isArray(geminiOutput.pedidosNaoCobertos)
      ? geminiOutput.pedidosNaoCobertos
      : [],
    subtotal,
    taxaIva,
    iva,
    total,
    estado: "gerada",
    criadoEm: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "propostas", propostaId), {
      ...propostaData,
      _srvToken: SERVER_INTERNAL_TOKEN,
    });

    // Atualiza o estado do pedido para "proposta gerada"
    await setDoc(
      doc(db, "pedidos", pedidoId),
      {
        estado: "proposta gerada",
        propostaId,
        atualizadoEm: new Date().toISOString(),
        _srvToken: SERVER_INTERNAL_TOKEN,
      },
      { merge: true },
    );
  } catch (err) {
    console.error("[Proposta Server] Erro ao gravar proposta no Firestore:", err);
    return {
      ok: false,
      pedidoId,
      error:
        "O pedido foi registado, mas não foi possível arquivar a proposta gerada. Por favor, contacte o suporte.",
    };
  }

  // 6. Envio de e-mail ao cliente com Nodemailer
  const rawAppUrl =
    process.env.APP_URL ||
    "https://ais-pre-4kxra4ukeqf6sfctppu3no-806486718432.europe-west2.run.app";
  const baseUrl = rawAppUrl.replace(/\/+$/, "");
  const propostaLink = `${baseUrl}/proposta/${propostaId}`;

  const emailRes = await enviarEmailProposta({
    paraEmail: email,
    nomeCliente: nome,
    resumo: propostaData.resumo,
    total: propostaData.total,
    linkProposta: propostaLink,
  });

  if (emailRes.ok) {
    const dataEnvio = new Date().toISOString();
    propostaData.estado = "enviada";
    propostaData.dataEnvio = dataEnvio;
    propostaData.link = propostaLink;

    try {
      await setDoc(
        doc(db, "propostas", propostaId),
        {
          estado: "enviada",
          dataEnvio,
          link: propostaLink,
          _srvToken: SERVER_INTERNAL_TOKEN,
        },
        { merge: true },
      );
    } catch (updateErr) {
      console.error("[Proposta Server] Erro ao atualizar proposta para 'enviada':", updateErr);
    }
  } else {
    propostaData.estado = "erro_email";
    propostaData.erroEmail = emailRes.error;
    propostaData.link = propostaLink;

    try {
      await setDoc(
        doc(db, "propostas", propostaId),
        {
          estado: "erro_email",
          erroEmail: emailRes.error,
          link: propostaLink,
          _srvToken: SERVER_INTERNAL_TOKEN,
        },
        { merge: true },
      );
    } catch (updateErr) {
      console.error("[Proposta Server] Erro ao atualizar proposta para 'erro_email':", updateErr);
    }
  }

  // 7. Devolve ao frontend o ID da proposta (e os detalhes para apresentação imediata)
  return {
    ok: true,
    propostaId,
    pedidoId,
    proposta: propostaData,
    mensagem: "Pedido registado e proposta gerada com sucesso!",
  };
}

/**
 * Consulta uma proposta pelo ID.
 */
export async function obterProposta(propostaId: string): Promise<Proposta | null> {
  try {
    const snap = await getDoc(doc(db, "propostas", propostaId));
    if (!snap.exists()) return null;
    return snap.data() as Proposta;
  } catch (err) {
    console.error("[Proposta Server] Erro ao obter proposta:", err);
    return null;
  }
}

/**
 * Consulta uma proposta pública no servidor de forma sanitizada e segura:
 * - O browser não acede diretamente ao Firestore.
 * - Não expõe o e-mail nem dados privados do cliente.
 * - Retorna o nome, data, resumo, itens com descrição, totais discriminados ("a pagar uma vez" e "por mês" com IVA)
 *   e pedidos não cobertos.
 * - Retorna null se não encontrada (para exibição de 404).
 */
export async function obterPropostaPublica(propostaId: string): Promise<PropostaPublica | null> {
  const cleanId = (propostaId || "").trim();
  if (!cleanId || cleanId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    return null;
  }

  try {
    const snap = await getDoc(doc(db, "propostas", cleanId));
    if (!snap.exists()) {
      return null;
    }

    const data = snap.data() as Proposta;

    // Obter nome do cliente sem expor e-mail nem outros campos confidenciais
    let nomeCliente = data.nomeCliente?.trim();
    if (!nomeCliente && data.pedidoId) {
      try {
        const pedidoSnap = await getDoc(doc(db, "pedidos", data.pedidoId));
        if (pedidoSnap.exists()) {
          const pData = pedidoSnap.data();
          nomeCliente = (pData.nome || "").trim();
        }
      } catch (pErr) {
        console.warn("[Proposta Server] Não foi possível obter nome do pedido:", pErr);
      }
    }

    if (!nomeCliente) {
      nomeCliente = "Cliente Norte";
    }

    // Carregar catálogo oficial para garantir descrição completa e oficial dos itens
    await seedCatalogoIfEmpty();
    const catalogoSnap = await getDocs(collection(db, "catalogo"));
    const catalogoMap = new Map<string, CatalogoItem>(
      catalogoSnap.docs.map((d) => [d.id, d.data() as CatalogoItem]),
    );

    const rawItens = Array.isArray(data.itens) ? data.itens : [];
    const itens: PropostaPublicaItem[] = rawItens.map((item) => {
      const servico = catalogoMap.get(item.catalogoId);
      const preco = Number(item.preco) || 0;
      const quantidade = Math.max(1, Number(item.quantidade) || 1);
      const subtotal = Number(item.subtotal ?? (preco * quantidade).toFixed(2));
      const unidade = (item.unidade || servico?.unidade || "unidade").trim();
      const nome = (item.nome || servico?.nome || "Serviço").trim();
      const descricao = (item.descricao || servico?.descricao || item.justificacao || "").trim();

      return {
        catalogoId: item.catalogoId,
        nome,
        descricao,
        preco,
        unidade,
        quantidade,
        justificacao: (item.justificacao || "").trim(),
        subtotal,
      };
    });

    // Separar cálculos: "por mês" vs "a pagar uma vez"
    let subtotalMensal = 0;
    let subtotalPontual = 0;

    for (const item of itens) {
      const u = item.unidade.toLowerCase();
      if (u.includes("mês") || u.includes("mes") || u === "mensal") {
        subtotalMensal += item.subtotal;
      } else {
        subtotalPontual += item.subtotal;
      }
    }

    subtotalMensal = Number(subtotalMensal.toFixed(2));
    subtotalPontual = Number(subtotalPontual.toFixed(2));

    const ivaMensal = Number((subtotalMensal * 0.23).toFixed(2));
    const totalMensal = Number((subtotalMensal + ivaMensal).toFixed(2));

    const ivaPontual = Number((subtotalPontual * 0.23).toFixed(2));
    const totalPontual = Number((subtotalPontual + ivaPontual).toFixed(2));

    const subtotalGeral = Number((subtotalMensal + subtotalPontual).toFixed(2));
    const ivaGeral = Number((ivaMensal + ivaPontual).toFixed(2));
    const totalGeral = Number((totalMensal + totalPontual).toFixed(2));

    return {
      id: data.id || cleanId,
      nomeCliente,
      criadoEm: data.criadoEm || new Date().toISOString(),
      resumo: (data.resumo || "").trim(),
      itens,
      pedidosNaoCobertos: Array.isArray(data.pedidosNaoCobertos) ? data.pedidosNaoCobertos : [],
      totais: {
        subtotalMensal,
        ivaMensal,
        totalMensal,
        subtotalPontual,
        ivaPontual,
        totalPontual,
        subtotalGeral,
        ivaGeral,
        totalGeral,
      },
      estado: data.estado || "gerada",
      dataEnvio: data.dataEnvio,
      link: data.link,
    };
  } catch (err) {
    console.error("[Proposta Server] Erro ao obter proposta pública:", err);
    return null;
  }
}
