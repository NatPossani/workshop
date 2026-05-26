import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const n8nTarget = env.VITE_N8N_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      proxy: n8nTarget
        ? {
            "/api/n8n": {
              target: n8nTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/n8n/, ""),
            },
          }
        : undefined,
    },
  };
});
