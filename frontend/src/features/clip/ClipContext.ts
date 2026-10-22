import { createContext } from "react";
import type { ClipMetadata, ClipProperties } from "~/lib/clip";
import type { LayerId } from "~/lib/layer";
import type { Transform } from "~/lib/transform";

export type ClipContextValue = {
	clips: ClipMetadata[];
	selectedClipId: string | undefined;
	transform: Transform | undefined;
	selection:
		| { x: number; y: number; width: number; height: number }
		| undefined;
	selectClip: (id: string) => void;
	setSelection: (
		selection:
			| { x: number; y: number; width: number; height: number }
			| undefined,
	) => void;
	copy: () => Promise<void>;
	cut: () => Promise<void>;
	paste: () => Promise<void>;
	selectAll: () => void;
	duplicateSelectedClip: () => Promise<void>;
	addClip: (start: number, layerId: LayerId) => Promise<void>;
	deleteClip: (id: string) => Promise<void>;
	moveClip: (id: string, start: number, layerId: LayerId) => Promise<void>;
	changeClipDuration: (id: string, duration: number) => Promise<void>;
	changeClipName: (id: string, name: string) => Promise<void>;
	changeClipSize: (id: string, width: number, height: number) => Promise<void>;
	changeClipProperties: (
		id: string,
		properties: ClipProperties,
	) => Promise<void>;
	changeTransform: (id: string, transform: Transform) => Promise<void>;
	ensureClipAt: (
		frame: number,
		layerId: LayerId | null,
	) => Promise<string | undefined>;
};

export const ClipContext = createContext<ClipContextValue | null>(null);
