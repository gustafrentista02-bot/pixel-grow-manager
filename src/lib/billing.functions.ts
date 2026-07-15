import { createServerFn } from "@tanstack/react-start";

export const getCaktoCheckoutUrl = createServerFn({ method: "GET" }).handler(async () => {
  return { url: process.env.CAKTO_CHECKOUT_URL ?? "" };
});
