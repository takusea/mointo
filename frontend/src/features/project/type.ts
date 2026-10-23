export type CompositionSettings = {
	width: number;
	height: number;
	frameRate: number;
	startFrame: number;
	endFrame: number;
};

export const DEFAULT_WIDTH = 640;
export const DEFAULT_HEIGHT = 360;
export const DEFAULT_FRAME_RATE = 24;
export const DEFAULT_START_FRAME = 0;
export const DEFAULT_END_FRAME = 120;
export const MAX_FRAME_INDEX = 10000;
