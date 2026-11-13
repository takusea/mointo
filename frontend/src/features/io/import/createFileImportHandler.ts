type FileImporter = (file: File) => Promise<void>;

export const createFileImportHandler =
	(accept: string, importFile: FileImporter) => async (file?: File) => {
		if (file != null) {
			await importFile(file);
			return;
		}

		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.addEventListener("change", () => {
			const selectedFile = input.files?.[0];
			if (selectedFile) void importFile(selectedFile);
		});
		input.click();
	};
