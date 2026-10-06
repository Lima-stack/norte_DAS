import { createServerFn } from "@tanstack/react-start";
import { getCatalogo, seedCatalogoIfEmpty } from "./catalogo.server";

export const getCatalogoItems = createServerFn({ method: "GET" }).handler(async () => {
  await seedCatalogoIfEmpty();
  return getCatalogo();
});
