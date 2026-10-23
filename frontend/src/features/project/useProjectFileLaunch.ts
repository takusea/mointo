import { useEffect } from "react";

type LaunchQueue = {
	setConsumer: (
		consumer: (params: { files: FileSystemFileHandle[] }) => void,
	) => void;
};

declare global {
	interface Window {
		launchQueue?: LaunchQueue;
	}
}

export const useProjectFileLaunch = (
	importFile: (file: File) => Promise<void>,
) => {
	useEffect(() => {
		window.launchQueue?.setConsumer(({ files }) => {
			const handle = files[0];
			if (!handle) return;
			void handle.getFile().then(importFile);
		});
	}, [importFile]);
};
