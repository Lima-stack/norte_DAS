import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminEmail, listarPropostasAdmin, type PropostaAdminRow } from "./admin.server";

export const obterAdminConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ adminEmail: string }> => {
    return { adminEmail: getAdminEmail() };
  },
);

export const carregarPropostasAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        userEmail: z.string().email(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ propostas: PropostaAdminRow[] }> => {
    const allowedAdmin = getAdminEmail().toLowerCase();
    if (data.userEmail.trim().toLowerCase() !== allowedAdmin) {
      throw new Error("Acesso não autorizado.");
    }
    const propostas = await listarPropostasAdmin();
    return { propostas };
  });
