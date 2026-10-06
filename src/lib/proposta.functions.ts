import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  submeterPedido,
  obterProposta,
  obterPropostaPublica,
  type SubmeterPedidoResponse,
  type Proposta,
  type PropostaPublica,
} from "./proposta.server";

const pedidoSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  pedido: z.string().trim().min(5, "O pedido deve ter pelo menos 5 caracteres").max(2000),
});

export const criarPedidoProposta = createServerFn({ method: "POST" })
  .inputValidator((data) => pedidoSchema.parse(data))
  .handler(async ({ data }): Promise<SubmeterPedidoResponse> => {
    return submeterPedido(data);
  });

export const consultarProposta = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ proposta: Proposta | null }> => {
    const proposta = await obterProposta(data.id);
    return { proposta };
  });

export const consultarPropostaPublica = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ proposta: PropostaPublica | null }> => {
    const proposta = await obterPropostaPublica(data.id);
    return { proposta };
  });
