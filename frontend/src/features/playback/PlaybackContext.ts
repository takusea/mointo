import { createContext } from "react";

export type PlaybackContextValue = {
	currentFrame: number;
	isPlaying: boolean;
	isLoop: boolean;
	isScrollFollow: boolean;
	startFrame: number;
	endFrame: number;
	maxFrameCount: number;

	setCurrentFrame: (frame: number) => void;
	setIsLoop: (loop: boolean) => void;
	setIsScrollFollow: (enabled: boolean) => void;

	play: () => void;
	pause: () => void;
	stop: () => void;

	renderFrame: (frame: number) => Promise<Uint8ClampedArray | undefined>;
	renderFrameToCanvas: (
		frame: number,
		canvas: HTMLCanvasElement,
	) => Promise<boolean>;
};

export const PlaybackContext = createContext<PlaybackContextValue | null>(null);
