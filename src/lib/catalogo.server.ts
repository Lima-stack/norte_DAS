import { collection, doc, getDocs, setDoc, limit, query } from "firebase/firestore";
import { db, auth } from "./firebase";

export interface CatalogoItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  unidade: string;
  ativo: boolean;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const SAMPLE_CATALOGO: CatalogoItem[] = [
  {
    id: "plano-starter",
    nome: "Plano Starter Norte",
    descricao:
      "Subscrição base da loja online com temas pré-criados, venda omnicanal e créditos à medida que vende.",
    preco: 1,
    unidade: "mês",
    ativo: true,
  },
  {
    id: "plano-crescimento",
    nome: "Plano Crescimento Norte",
    descricao:
      "Plano avançado com relatórios detalhados, automações e 0.5% de retorno em créditos de subscrição até 8000 €.",
    preco: 29,
    unidade: "mês",
    ativo: true,
  },
  {
    id: "pacote-ia-sidekick",
    nome: "Pacote Extra IA Sidekick",
    descricao:
      "Pacote adicional de 5 milhões de tokens para o assistente de IA gerir descrições, produtos e análises.",
    preco: 15,
    unidade: "unidade",
    ativo: true,
  },
  {
    id: "personalizacao-tema",
    nome: "Personalização de Tema e Identidade",
    descricao:
      "Adaptação profissional da identidade visual, tipografia e layout da sua loja com designers especializados.",
    preco: 180,
    unidade: "unidade",
    ativo: true,
  },
  {
    id: "configuracao-omnicanal",
    nome: "Configuração Omnicanal",
    descricao:
      "Sincronização do catálogo de produtos com Instagram Shop, Facebook, Google Shopping e principais marketplaces.",
    preco: 120,
    unidade: "unidade",
    ativo: true,
  },
  {
    id: "migracao-catalogo",
    nome: "Migração Completa de Loja",
    descricao:
      "Importação e validação de produtos, fotografias, clientes e histórico de encomendas a partir de outra plataforma.",
    preco: 250,
    unidade: "unidade",
    ativo: true,
  },
  {
    id: "consultoria-estrategica",
    nome: "Consultoria de E-commerce e Vendas",
    descricao:
      "Sessão individual com consultor especialista para otimização de conversão, margens e estratégia de aquisição.",
    preco: 65,
    unidade: "hora",
    ativo: true,
  },
  {
    id: "configuracao-dominio",
    nome: "Configuração de Domínio e E-mail",
    descricao:
      "Ligação rápida de domínio personalizado com certificado SSL dedicado e configuração de registos DNS e SPF/DKIM.",
    preco: 40,
    unidade: "unidade",
    ativo: true,
  },
  {
    id: "suporte-dedicado",
    nome: "Suporte Prioritário 24/7",
    descricao:
      "Acompanhamento prioritário dedicado por chat direto e videochamada com tempo de resposta garantido.",
    preco: 49,
    unidade: "mês",
    ativo: true,
  },
];

let isSeeding = false;
let hasSeeded = false;

/**
 * Preenche a coleção "catalogo" no servidor se estiver vazia.
 */
export async function seedCatalogoIfEmpty(): Promise<{
  seeded: boolean;
  count: number;
}> {
  if (hasSeeded || isSeeding) {
    return { seeded: false, count: SAMPLE_CATALOGO.length };
  }
  isSeeding = true;

  try {
    const colRef = collection(db, "catalogo");
    const q = query(colRef, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(
        "[Norte Server] Coleção 'catalogo' está vazia. A preencher com serviços de exemplo...",
      );
      for (const item of SAMPLE_CATALOGO) {
        const docRef = doc(db, "catalogo", item.id);
        await setDoc(docRef, { ...item, _srvToken: "norte_srv_key_2026" });
      }
      console.log(
        `[Norte Server] Coleção 'catalogo' preenchida com sucesso com ${SAMPLE_CATALOGO.length} itens.`,
      );
      hasSeeded = true;
      return { seeded: true, count: SAMPLE_CATALOGO.length };
    } else {
      console.log("[Norte Server] Coleção 'catalogo' já contém dados. Nenhuma ação necessária.");
      hasSeeded = true;
      return { seeded: false, count: snapshot.size };
    }
  } catch (error) {
    console.warn(
      "[Norte Server] Aviso ao verificar/preencher catálogo no Firestore:",
      error instanceof Error ? error.message : error,
    );
    return { seeded: false, count: 0 };
  } finally {
    isSeeding = false;
  }
}

/**
 * Obtém todos os itens do catálogo.
 */
export async function getCatalogo(): Promise<CatalogoItem[]> {
  try {
    const colRef = collection(db, "catalogo");
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return SAMPLE_CATALOGO;
    }
    return snapshot.docs.map((docSnap) => docSnap.data() as CatalogoItem);
  } catch (error) {
    console.warn(
      "[Norte Server] Não foi possível ler 'catalogo' do Firestore, a usar tabela padrão:",
      error instanceof Error ? error.message : error,
    );
    return SAMPLE_CATALOGO;
  }
}
