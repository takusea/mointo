type SaveFileHandle = {
	createWritable: () => Promise<{
		write: (data: Blob) => Promise<void>;
		close: () => Promise<void>;
	}>;
};

type SaveFilePickerOptions = {
	suggestedName: string;
	types?: {
		description?: string;
		accept: Record<string, string[]>;
	}[];
};

type WindowWithSaveFilePicker = Window &
	typeof globalThis & {
		showSaveFilePicker?: (
			options: SaveFilePickerOptions,
		) => Promise<SaveFileHandle>;
	};

export type SaveDestination =
	| { type: "file"; handle: SaveFileHandle }
	| { type: "download"; suggestedName: string }
	| { type: "cancelled" };

export const chooseSaveDestination = async (
	suggestedName: string,
	mimeTypes: string[],
	description?: string,
): Promise<SaveDestination> => {
	const showSaveFilePicker = (window as WindowWithSaveFilePicker)
		.showSaveFilePicker;
	if (showSaveFilePicker == null) {
		return { type: "download", suggestedName };
	}

	try {
		const handle = await showSaveFilePicker({
			suggestedName,
			types: [
				{
					description,
					accept: Object.fromEntries(
						mimeTypes.map((mimeType) => [
							mimeType,
							[`.${suggestedName.split(".").at(-1) ?? ""}`],
						]),
					),
				},
			],
		});
		return { type: "file", handle };
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			return { type: "cancelled" };
		}
		return { type: "download", suggestedName };
	}
};

export const writeSavedBlob = async (
	destination: SaveDestination,
	blob: Blob,
) => {
	if (destination.type === "cancelled") return false;
	if (destination.type === "file") {
		const writable = await destination.handle.createWritable();
		await writable.write(blob);
		await writable.close();
		return true;
	}

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = destination.suggestedName;
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	return true;
};
