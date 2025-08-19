import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    https: {
      key: "./certs/privkey.pem",
      cert: "./certs/fullchain.pem",
    },
    host: "0.0.0.0",
    port: 8080,
  },
});
