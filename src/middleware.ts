import { clerkMiddleware } from "@clerk/astro/server";

export const onRequest = clerkMiddleware({
    authorizedParties: ["https://manudev.dev"],
});
