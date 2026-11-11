import { createContext } from "react";
import type { ClipMetadata, ClipProperties } from "~/lib/clip";
import type { LayerId } from "~/lib/layer";
import type { Transform } from "~/lib/transform";

export type ClipContextValue = {
	clips: ClipMetadata[];
	selectedClipId: string | undefined;
	selectedClipIds: string[];
	transform: Transform | undefined;
	selection: SelectionArea | undefined;
	selectClip: (
		id: string,
		addToSelection?: boolean,
		preserveSelection?: boolean,
		deferLayerSelect?: boolean,
		selectRange?: boolean,
		addRangeToSelection?: boolean,
	) => void;
	selectClips: (ids: string[]) => void;
	setSelection: (selection: SelectionArea | undefined) => void;
	reselect: () => void;
	canReselect: boolean;
	invertSelection: () => void;
	modifySelection: (amount: number) => void;
	copy: () => Promise<void>;
	cut: () => Promise<void>;
	paste: () => Promise<void>;
	selectAll: () => void;
	duplicateSelectedClip: () => Promise<void>;
	linkDuplicateSelectedClip: () => Promise<void>;
	canMergeSelectedClips: boolean;
	mergeSelectedClips: () => Promise<void>;
	addClip: (start: number, layerId: LayerId) => Promise<void>;
	deleteClip: (id: string) => Promise<void>;
	moveClip: (
		id: string,
		start: number,
		layerId: LayerId,
		frameDelta?: number,
		layerDelta?: number,
		gestureId?: string,
	) => Promise<void>;
	changeClipDuration: (
		id: string,
		duration: number,
		durationDelta?: number,
		gestureId?: string,
	) => Promise<void>;
	changeClipName: (id: string, name: string) => Promise<void>;
	changeClipSize: (
		id: string,
		width: number,
		height: number,
		dimension?: "width" | "height",
	) => Promise<void>;
	changeClipProperties: (
		id: string,
		properties: Partial<ClipProperties>,
	) => Promise<void>;
	changeTransform: (id: string, transform: Transform) => Promise<void>;
	ensureClipAt: (
		frame: number,
		layerId: LayerId | null,
	) => Promise<string | undefined>;
};

export type SelectionArea = {
	x: number;
	y: number;
	width: number;
	height: number;
	mask?: Uint8Array;
	points?: { x: number; y: number }[];
};

export const ClipContext = createContext<ClipContextValue | null>(null);
