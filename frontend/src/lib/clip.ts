import type { LayerId } from "./layer";

export type ClipMetadata = {
	id: string;
	asset_id: string;
	name: string;
	width: number;
	height: number;
	start: number;
	duration: number;
	layer_index: number;
	layer_id: LayerId;
	hidden: boolean;
	alpha_locked: boolean;
	locked: boolean;
	opacity: number;
	blend_mode: BlendMode;
};

export type BlendMode = "normal" | "multiply" | "screen" | "add";

export type ClipProperties = Pick<
	ClipMetadata,
	"hidden" | "alpha_locked" | "locked" | "opacity" | "blend_mode"
>;
