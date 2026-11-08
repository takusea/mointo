import type { LayerId } from "./layer";

type ClipMetadataCommon = {
	id: string;
	name: string;
	start: number;
	duration: number;
	layer_index: number;
	layer_id: LayerId;
	hidden: boolean;
	locked: boolean;
};

export type ImageClipMetadata = ClipMetadataCommon & {
	clip_type: "image";
	asset_id: string;
	width: number;
	height: number;
	alpha_locked: boolean;
	opacity: number;
	blend_mode: BlendMode;
};

export type AudioClipMetadata = ClipMetadataCommon & {
	clip_type: "audio";
	asset_id: string;
	audio_mime_type: string;
	audio_start_frame: number;
};

export type ClipType = "audio" | "image";

export type ClipMetadata = ImageClipMetadata | AudioClipMetadata;

export type BlendMode = "normal" | "multiply" | "screen" | "add";

export type ClipProperties = {
	hidden: boolean;
	alpha_locked?: boolean;
	locked: boolean;
	opacity?: number;
	blend_mode?: BlendMode;
	audio_start_frame?: number;
};
