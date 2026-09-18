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
        rollupOptions: {
            input: {
                original: path.resolve(import.meta.dirname, "index.html"),
                roundTwo: path.resolve(import.meta.dirname, "round-two.html"),
                applicationFlow: path.resolve(import.meta.dirname, "application-flow.html"),
            },
        },
        outDir: path.resolve(
            import.meta.dirname,
            "../../../../public/workstation-concepts",
        ),
        emptyOutDir: true,
    },
});
