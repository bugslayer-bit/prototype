import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { masterDataApiPlugin } from "../shared/masterDataApiPlugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), masterDataApiPlugin()]
});
