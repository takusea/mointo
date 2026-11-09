import { useEffect, useRef, useState } from "react";
import { useAudioImport } from "~/features/io/import/useAudioImport";
import { useImageImport } from "~/features/io/import/useImageImport";
import { useProject } from "~/features/project/useProject";

const getDroppedFileType = (file: File) => {
	const extension = file.name.split(".").pop()?.toLowerCase();
	if (extension === "moiproj") return "project";
	if (
		file.type.startsWith("image/") ||
		[
			"avif",
			"bmp",
			"gif",
			"jpg",
			"jpeg",
			"png",
			"svg",
			"tif",
			"tiff",
			"webp",
		].includes(extension ?? "")
	)
		return "image";
	if (
		file.type.startsWith("audio/") ||
		[
			"aac",
			"flac",
			"m4a",
			"mid",
			"midi",
			"mp3",
			"oga",
			"ogg",
			"opus",
			"wav",
			"weba",
			"wma",
		].includes(extension ?? "")
	)
		return "audio";
	return null;
};

const useFileDrop = () => {
	const project = useProject();
	const importImage = useImageImport();
	const importAudio = useAudioImport();
	const [isDraggingFiles, setIsDraggingFiles] = useState(false);
	const dragDepth = useRef(0);
	const handlers = useRef({
		importAudio,
		importImage,
		importProject: project.importFile,
	});
	handlers.current = {
		importAudio,
		importImage,
		importProject: project.importFile,
	};

	useEffect(() => {
		const hasFiles = (event: DragEvent) =>
			Array.from(event.dataTransfer?.types ?? []).includes("Files");
		const handleDragEnter = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current += 1;
			setIsDraggingFiles(true);
		};
		const handleDragLeave = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) setIsDraggingFiles(false);
		};
		const handleDragOver = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
		};
		const handleDrop = async (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current = 0;
			setIsDraggingFiles(false);

			const files = Array.from(event.dataTransfer?.files ?? []);
			const projectFile = files.find(
				(file) => getDroppedFileType(file) === "project",
			);
			if (projectFile) {
				try {
					await handlers.current.importProject(projectFile);
				} catch (error) {
					console.error("Failed to open dropped project.", error);
				}
				return;
			}

			for (const file of files) {
				const type = getDroppedFileType(file);
				if (type === "image") await handlers.current.importImage(file);
				else if (type === "audio") await handlers.current.importAudio(file);
			}
		};

		window.addEventListener("dragenter", handleDragEnter);
		window.addEventListener("dragleave", handleDragLeave);
		window.addEventListener("dragover", handleDragOver);
		window.addEventListener("drop", handleDrop);
		return () => {
			window.removeEventListener("dragenter", handleDragEnter);
			window.removeEventListener("dragleave", handleDragLeave);
			window.removeEventListener("dragover", handleDragOver);
			window.removeEventListener("drop", handleDrop);
		};
	}, []);

	return isDraggingFiles;
};

export default useFileDrop;
