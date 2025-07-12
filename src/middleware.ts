import { clerkMiddleware } from "@clerk/astro/server";

export const onRequest = clerkMiddleware({
    // Remove authorizedParties for now to allow all origins
    // This is often needed for production deployments
});
