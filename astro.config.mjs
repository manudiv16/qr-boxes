// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";

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
  adapter: node({ mode: "standalone" }),
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    define: {
      "process.env.PUBLIC_CLERK_PUBLISHABLE_KEY": JSON.stringify(
        process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
      ),
    },
  },
});
