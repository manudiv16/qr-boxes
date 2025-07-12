// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";

import vercel from "@astrojs/vercel";

// Default environment variables for builhttps://astro.build/config
export default defineConfig({
  integrations: [
    clerk({
      afterSignInUrl: "/dashboard",
      afterSignUpUrl: "/dashboard",
      signInUrl: "/",
      signUpUrl: "/",
    }),
  ],
  adapter: vercel(),
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    define: {
      "process.env.PUBLIC_CLERK_PUBLISHABLE_KEY": JSON.stringify(
        process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
      ),
      "process.env.PUBLIC_BACKEND_URL": JSON.stringify(
        process.env.PUBLIC_BACKEND_URL || "http://localhost:8080",
      ),
    },
  },
});