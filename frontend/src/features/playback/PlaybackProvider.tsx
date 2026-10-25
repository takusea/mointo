import { type JSX, useEffect, useState } from "react";
import { useCore } from "~/core/useCore";
import {
	DEFAULT_END_FRAME,
	DEFAULT_START_FRAME,
	MAX_FRAME_INDEX,
} from "~/features/project/type";
import { useProject } from "~/features/project/useProject";
import { PlaybackContext } from "./PlaybackContext";

const FRAME_RANGE_BUFFER = 256;

type Props = {
	children: JSX.Element;
};

export const PlaybackProvider = ({ children }: Props) => {
	const core = useCore();
	const project = useProject();

	const [currentFrame, setCurrentFrame] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoop, setIsLoop] = useState(false);
	const [isScrollFollow, setIsScrollFollow] = useState(true);

	const startFrame = project.settings?.startFrame ?? DEFAULT_START_FRAME;
	const endFrame = project.settings?.endFrame ?? DEFAULT_END_FRAME;
	const maxFrameCount = Math.min(
		MAX_FRAME_INDEX + 1,
		endFrame + FRAME_RANGE_BUFFER + 1,
	);

	useEffect(() => {
		if (!isPlaying || !project.settings) return;

		const interval = setInterval(() => {
			setCurrentFrame((frame) => {
				if (frame < endFrame) return frame + 1;
				return isLoop ? startFrame : frame;
			});
		}, 1000 / project.settings.frameRate);
		return () => clearInterval(interval);
	}, [endFrame, isLoop, isPlaying, project.settings, startFrame]);

	useEffect(() => {
		if (isPlaying && !isLoop && currentFrame >= endFrame) {
			setIsPlaying(false);
		}
	}, [currentFrame, endFrame, isLoop, isPlaying]);

	const setCurrentFrameClamped = (frame: number) => {
		setCurrentFrame(Math.min(Math.max(frame, startFrame), endFrame));
	};

	useEffect(() => {
		if (currentFrame >= 0) void core.clearClipPreviewKeyframes();
	}, [core, currentFrame]);

	const play = () => {
		if (!project.settings) return;
		if (currentFrame >= endFrame) setCurrentFrame(startFrame);
		setIsPlaying(true);
	};

	const pause = () => {
		setIsPlaying(false);
	};

	const stop = () => {
		pause();
		setCurrentFrame(startFrame);
	};

	const renderFrame = async (
		frameIndex: number,
	): Promise<Uint8ClampedArray | undefined> => {
		return core.renderFrame(frameIndex);
	};

	const renderFrameToCanvas = (frameIndex: number, canvas: HTMLCanvasElement) =>
		core.renderFrameToCanvas(frameIndex, canvas);

	return (
		<PlaybackContext
			value={{
				currentFrame,
				isPlaying,
				isLoop,
			isScrollFollow,
				startFrame,
				endFrame,
				maxFrameCount,
				setCurrentFrame: setCurrentFrameClamped,
				setIsLoop,
			setIsScrollFollow,
				play,
				pause,
				stop,
				renderFrame,
				renderFrameToCanvas,
			}}
		>
			{children}
		</PlaybackContext>
	);
};
