import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const appVersion = process.env.GITHUB_SHA?.slice(0, 7) ?? "dev";
const buildDate =
	process.env.APP_BUILD_DATE ?? new Date().toISOString().slice(0, 10);

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(appVersion),
		__BUILD_DATE__: JSON.stringify(buildDate),
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		cloudflare(),
		react({ compiler: true }),
		tailwindcss(),
		basicSsl(),
		VitePWA({
			workbox: {
				globDirectory: ".cloudflare/output/v0/workers/default/assets/",
				swDest: ".cloudflare/output/v0/workers/default/assets/sw.js",
			},
			registerType: "autoUpdate",
			devOptions: {
				enabled: true,
			},
			manifest: {
				name: "mointo",
				description: "Animation Paint App",
				display: "standalone",
				start_url: "/",
				display_override: ["window-controls-overlay"],
				file_handlers: [
					{
						action: "/",
						accept: {
							"application/vnd.moiproj": [".moiproj"],
						},
					},
				],
				icons: [
					{
						src: "pwa-64x64.png",
						sizes: "64x64",
						type: "image/png",
					},
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
		}),
	],
	server: {
		host: true,
	},
});
