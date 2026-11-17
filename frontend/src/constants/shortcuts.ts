import type { MessageKey } from "~/features/i18n/I18nContext";

export const shortcutDefinitions = {
	newProject: { label: "action.file.new", defaultKey: "mod+n" },
	openProject: { label: "action.file.open", defaultKey: "mod+o" },
	saveProject: { label: "action.file.save", defaultKey: "mod+s" },
	closeProject: { label: "action.file.close", defaultKey: "mod+w" },
	saveWith: { label: "action.file.saveWith", defaultKey: "mod+shift+s" },
	projectSettings: {
		label: "action.file.projectSettings",
		defaultKey: "mod+p",
	},
	undo: { label: "action.edit.undo", defaultKey: "mod+z" },
	redo: { label: "action.edit.redo", defaultKey: "mod+shift+z" },
	cut: { label: "action.edit.cut", defaultKey: "mod+x" },
	copy: { label: "action.edit.copy", defaultKey: "mod+c" },
	paste: { label: "action.edit.paste", defaultKey: "mod+v" },
	selectAll: { label: "action.select.selectAll", defaultKey: "mod+a" },
	addClip: { label: "action.edit.addImageClip", defaultKey: "insert" },
	addAudioClip: {
		label: "action.edit.addAudioClip",
		defaultKey: "alt+insert",
	},
	addGroupClip: {
		label: "action.edit.addGroupClip",
		defaultKey: "shift+insert",
	},
	duplicateClip: { label: "action.edit.duplicateClip", defaultKey: "mod+d" },
	duplicateLinkedClip: {
		label: "action.edit.duplicateLinkedClip",
		defaultKey: "alt+d",
	},
	mergeClips: { label: "action.edit.mergeClips", defaultKey: "mod+e" },
	moveClipLeft: {
		label: "action.edit.moveClipLeft",
		defaultKey: "mod+arrowleft",
	},
	moveClipRight: {
		label: "action.edit.moveClipRight",
		defaultKey: "mod+arrowright",
	},
	moveClipUp: {
		label: "action.edit.moveClipUp",
		defaultKey: "mod+arrowup",
	},
	moveClipDown: {
		label: "action.edit.moveClipDown",
		defaultKey: "mod+arrowdown",
	},
	decreaseClipDuration: {
		label: "action.edit.decreaseClipDuration",
		defaultKey: "mod+shift+arrowleft",
	},
	increaseClipDuration: {
		label: "action.edit.increaseClipDuration",
		defaultKey: "mod+shift+arrowright",
	},
	swapLayerUp: {
		label: "action.edit.swapLayerUp",
		defaultKey: "mod+shift+arrowup",
	},
	swapLayerDown: {
		label: "action.edit.swapLayerDown",
		defaultKey: "mod+shift+arrowdown",
	},
	clearSelection: { label: "action.select.clear", defaultKey: "mod+shift+a" },
	reselect: { label: "action.select.reselect", defaultKey: "mod+shift+d" },
	invertSelection: {
		label: "action.select.invert",
		defaultKey: "mod+shift+i",
	},
	zoomIn: { label: "action.view.zoomIn", defaultKey: "mod+shift+equal" },
	zoomOut: { label: "action.view.zoomOut", defaultKey: "mod+minus" },
	fitView: { label: "action.view.fitView", defaultKey: "mod+shift+0" },
	resetZoom: { label: "action.view.resetZoom", defaultKey: "mod+0" },
	rotateLeft: {
		label: "action.view.rotateLeft",
		defaultKey: "mod+alt+arrowleft",
	},
	rotateRight: {
		label: "action.view.rotateRight",
		defaultKey: "mod+alt+arrowright",
	},
	resetRotation: {
		label: "action.view.resetRotation",
		defaultKey: "mod+alt+0",
	},
	flipHorizontal: {
		label: "action.view.flipHorizontal",
		defaultKey: "h",
	},
	flipVertical: { label: "action.view.flipVertical", defaultKey: "v" },
	resetFlip: { label: "action.view.resetFlip", defaultKey: "r" },
	toggleGrid: { label: "action.view.toggleGrid", defaultKey: "g" },
	toggleOnionSkin: {
		label: "action.view.toggleOnionSkin",
		defaultKey: "o",
	},
	togglePlayback: { label: "action.play.togglePlayback", defaultKey: "space" },
	stop: { label: "action.play.stop", defaultKey: "shift+space" },
	toggleLoop: { label: "action.play.toggleLoop", defaultKey: "l" },
	scrollFollow: {
		label: "action.play.scrollFollow",
		defaultKey: "f",
	},
	firstFrame: {
		label: "action.play.firstFrame",
		defaultKey: "shift+arrowleft",
	},
	previousFrame: {
		label: "action.play.previousFrame",
		defaultKey: "arrowleft",
	},
	nextFrame: { label: "action.play.nextFrame", defaultKey: "arrowright" },
	lastFrame: {
		label: "action.play.lastFrame",
		defaultKey: "shift+arrowright",
	},
	previousLayer: {
		label: "action.select.previousLayer",
		defaultKey: "arrowup",
	},
	nextLayer: {
		label: "action.select.nextLayer",
		defaultKey: "arrowdown",
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

export const isMacOS =
	typeof navigator !== "undefined" &&
	/mac/i.test(navigator.userAgent) &&
	!/iphone|ipad|ipod/i.test(navigator.userAgent);

const shortcutSymbols: Record<string, string> = {
	add: "+",
	backquote: "`",
	backslash: "\\",
	bracketleft: "[",
	bracketright: "]",
	comma: ",",
	decimal: ".",
	divide: "/",
	equal: "=",
	minus: "-",
	multiply: "*",
	parenleft: "(",
	parenright: ")",
	period: ".",
	quote: "'",
	semicolon: ";",
	slash: "/",
	star: "*",
	subtract: "-",
};

const shortcutKeyNames: Record<string, string> = {
	...Object.fromEntries(
		Array.from(
			{ length: 24 },
			(_, index) => [`f${index + 1}`, `F${index + 1}`] as const,
		),
	),
	alt: isMacOS ? "⌥" : "Alt",
	arrowdown: "↓",
	arrowleft: "←",
	arrowright: "→",
	arrowup: "↑",
	backspace: isMacOS ? "⌫" : "BackSpace",
	capslock: isMacOS ? "⇪" : "CapsLock",
	contextmenu: "ContextMenu",
	ctrl: isMacOS ? "⌃" : "Ctrl",
	delete: isMacOS ? "⌦" : "Delete",
	end: "End",
	enter: isMacOS ? "⏎" : "Enter",
	escape: isMacOS ? "⎋" : "Escape",
	fn: "Fn",
	fnlock: "FnLock",
	home: "Home",
	insert: "Insert",
	meta: isMacOS ? "⌘" : "Meta",
	mod: isMacOS ? "⌘" : "Ctrl",
	numlock: "NumLock",
	pagedown: "PageDown",
	pageup: "PageUp",
	pause: "Pause",
	printscreen: "PrintScreen",
	scrolllock: "ScrollLock",
	shift: isMacOS ? "⇧" : "Shift",
	space: "Space",
	tab: isMacOS ? "⇥" : "Tab",
};

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
			if (shortcutSymbols[part] != null) return shortcutSymbols[part];
			if (shortcutKeyNames[part] != null) return shortcutKeyNames[part];
			return part.length === 1 ? part.toUpperCase() : part;
		})
		.join(isMacOS ? " " : "+");
