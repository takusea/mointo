import { defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "mointo",
		compatibilityDate: "2026-10-19",
		assets: {
			notFoundHandling: "single-page-application",
		},
	},
});
