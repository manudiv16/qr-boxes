import { clerkMiddleware } from "@clerk/astro/server";

export const onRequest = clerkMiddleware({
    authorizedParties: [process.env.DOMAIN || `http://localhost:${process.env.PORT || 4321}`],
});
