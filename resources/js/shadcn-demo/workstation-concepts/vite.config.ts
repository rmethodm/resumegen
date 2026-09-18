import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
export default defineConfig({
    root: path.resolve(import.meta.dirname),
    base: "/workstation-concepts/",
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "../..") } },
    build: {
        outDir: path.resolve(
            import.meta.dirname,
            "../../../../public/workstation-concepts",
        ),
        emptyOutDir: true,
    },
});
