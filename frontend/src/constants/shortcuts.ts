import type { MessageKey } from "~/features/i18n/I18nContext";

export const shortcutDefinitions = {
	newProject: { label: "action.file.new", defaultKey: "ctrl+n" },
	openProject: { label: "action.file.open", defaultKey: "ctrl+o" },
	saveProject: { label: "action.file.save", defaultKey: "ctrl+s" },
	saveWith: { label: "action.file.saveWith", defaultKey: "ctrl+shift+s" },
	undo: { label: "action.edit.undo", defaultKey: "ctrl+z" },
	redo: { label: "action.edit.redo", defaultKey: "ctrl+shift+z" },
	cut: { label: "action.edit.cut", defaultKey: "ctrl+x" },
	copy: { label: "action.edit.copy", defaultKey: "ctrl+c" },
	paste: { label: "action.edit.paste", defaultKey: "ctrl+v" },
	selectAll: { label: "action.select.selectAll", defaultKey: "ctrl+a" },
	addClip: { label: "action.edit.addClip", defaultKey: "insert" },
	duplicateClip: { label: "action.edit.duplicateClip", defaultKey: "ctrl+d" },
	duplicateLinkedClip: {
		label: "action.edit.duplicateLinkedClip",
		defaultKey: "alt+d",
	},
	mergeClips: { label: "action.edit.mergeClips", defaultKey: "ctrl+e" },
	clearSelection: { label: "action.select.clear", defaultKey: "escape" },
	zoomIn: { label: "action.view.zoomIn", defaultKey: "ctrl+shift+equal" },
	zoomOut: { label: "action.view.zoomOut", defaultKey: "ctrl+minus" },
	fitView: { label: "action.view.fitView", defaultKey: "ctrl+shift+0" },
	resetZoom: { label: "action.view.resetZoom", defaultKey: "ctrl+0" },
	rotateLeft: {
		label: "action.view.rotateLeft",
		defaultKey: "ctrl+alt+ArrowLeft",
	},
	rotateRight: {
		label: "action.view.rotateRight",
		defaultKey: "ctrl+alt+ArrowRight",
	},
	resetRotation: {
		label: "action.view.resetRotation",
		defaultKey: "ctrl+alt+0",
	},
	flipHorizontal: {
		label: "action.view.flipHorizontal",
		defaultKey: "h",
	},
	flipVertical: { label: "action.view.flipVertical", defaultKey: "v" },
	resetFlip: { label: "action.view.resetFlip", defaultKey: "f" },
	toggleGrid: { label: "action.view.toggleGrid", defaultKey: "g" },
	toggleOnionSkin: {
		label: "action.view.toggleOnionSkin",
		defaultKey: "o",
	},
	togglePlayback: { label: "action.play.togglePlayback", defaultKey: "space" },
	stop: { label: "action.play.stop", defaultKey: "shift+space" },
	toggleLoop: { label: "action.play.toggleLoop", defaultKey: "l" },
	firstFrame: {
		label: "action.play.firstFrame",
		defaultKey: "shift+ArrowLeft",
	},
	previousFrame: {
		label: "action.play.previousFrame",
		defaultKey: "ArrowLeft",
	},
	nextFrame: { label: "action.play.nextFrame", defaultKey: "ArrowRight" },
	lastFrame: {
		label: "action.play.lastFrame",
		defaultKey: "shift+ArrowRight",
	},
	previousLayer: {
		label: "action.select.previousLayer",
		defaultKey: "ArrowUp",
	},
	nextLayer: {
		label: "action.select.nextLayer",
		defaultKey: "ArrowDown",
	},
	penTool: { label: "tool.pen", defaultKey: "1" },
	eraserTool: { label: "tool.eraser", defaultKey: "2" },
	fillTool: { label: "tool.fill", defaultKey: "3" },
	eyedropperTool: { label: "tool.eyedropper", defaultKey: "4" },
	selectTool: { label: "tool.select", defaultKey: "5" },
	transformTool: { label: "tool.move", defaultKey: "6" },
	deleteClip: { label: "action.edit.deleteClip", defaultKey: "delete" },
} satisfies Record<string, { label: MessageKey; defaultKey: string }>;

export type ShortcutId = keyof typeof shortcutDefinitions;
export type Shortcuts = Record<ShortcutId, string>;

export const defaultShortcuts = Object.fromEntries(
	Object.entries(shortcutDefinitions).map(([id, definition]) => [
		id,
		definition.defaultKey,
	]),
) as Shortcuts;

export const formatShortcut = (shortcut: string) =>
	shortcut
		.split("+")
		.map((part) => {
			const symbol = /^code:[A-Za-z0-9]+:([0-9a-f]+)$/i.exec(part);
			if (symbol != null) {
				return String.fromCodePoint(Number.parseInt(symbol[1], 16));
			}
			if (part === "backquote") return "`";
			if (part === "ctrl") return "Ctrl";
			if (part === "alt") return "Alt";
			if (part === "shift") return "Shift";
			if (part === "meta") return "Meta";
			if (part === "equal") return "=";
			if (part === "minus") return "-";
			if (part === "ArrowLeft") return "←";
			if (part === "ArrowRight") return "→";
			if (part === "ArrowUp") return "↑";
			if (part === "ArrowDown") return "↓";
			if (part === "space") return "Space";
			if (part === "insert") return "Insert";
			if (part === "delete") return "Delete";
			if (part === "escape") return "Escape";
			return part.length === 1 ? part.toUpperCase() : part;
		})
		.join("+");
