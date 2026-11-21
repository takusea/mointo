import { useRef } from "react";
import { useCore } from "~/core/useCore";
import { usePlayback } from "~/features/playback/usePlayback";
import type { LayerId } from "~/lib/layer";

export const useCanvasRender = () => {
	const playbackContext = usePlayback();
	const core = useCore();
	const frameRequestRef = useRef<number | null>(null);
	const onionOpacityRef = useRef(40);
	const pendingRenderRef = useRef<{
		canvas: HTMLCanvasElement;
		onionLayerId: LayerId | null;
		onionOpacity: number;
	} | null>(null);
	const renderingRef = useRef(false);
	const finishRender = () => {
		renderingRef.current = false;
		if (pendingRenderRef.current != null) scheduleRender();
	};
	const scheduleRender = () => {
		if (renderingRef.current || frameRequestRef.current != null) return;
		frameRequestRef.current = requestAnimationFrame(() => {
			frameRequestRef.current = null;
			const request = pendingRenderRef.current;
			pendingRenderRef.current = null;
			if (request == null) return;
			renderingRef.current = true;
			void core
				.renderFrameToCanvas(
					playbackContext.currentFrame,
					request.canvas,
					request.onionLayerId,
					request.onionOpacity,
				)
				.then(finishRender, finishRender);
		});
	};
	const render = (
		canvas: HTMLCanvasElement,
		_isOnionSkinEnabled: boolean,
		layerId: LayerId | null,
		onionOpacity?: number,
	) => {
		if (onionOpacity != null) onionOpacityRef.current = onionOpacity;
		pendingRenderRef.current = {
			canvas,
			onionLayerId:
				_isOnionSkinEnabled && !playbackContext.isPlaying ? layerId : null,
			onionOpacity: onionOpacityRef.current,
		};
		scheduleRender();
	};

	return { render };
};
