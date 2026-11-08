import { type JSX, useEffect, useRef, useState } from "react";
import { useCore } from "~/core/useCore";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
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
	const { clips, layers } = useCoreSnapshot();
	const [audioPlayers, setAudioPlayers] = useState(
		() =>
			new Map<
				string,
				{
					assetId: string;
					audioStartFrame: number;
					audio: HTMLAudioElement;
					url: string;
					failed: boolean;
				}
			>(),
	);
	const audioPlayersRef = useRef(audioPlayers);
	audioPlayersRef.current = audioPlayers;
	const pendingAudioIds = useRef(new Map<string, symbol>());

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
		let cancelled = false;
		const audioClips = clips.filter((clip) => clip.clip_type === "audio");
		const audioClipsById = new Map(audioClips.map((clip) => [clip.id, clip]));
		const requests = new Map<string, symbol>();

		const removedAudioIds: string[] = [];
		for (const [id, player] of audioPlayers) {
			const clip = audioClipsById.get(id);
			if (clip != null && clip.asset_id === player.assetId) continue;
			player.audio.pause();
			URL.revokeObjectURL(player.url);
			removedAudioIds.push(id);
		}
		if (removedAudioIds.length > 0) {
			setAudioPlayers((players) => {
				const next = new Map(players);
				for (const id of removedAudioIds) next.delete(id);
				return next;
			});
		}

		for (const clip of audioClips) {
			if (
				audioPlayers.get(clip.id)?.assetId === clip.asset_id ||
				pendingAudioIds.current.has(clip.id)
			)
				continue;
			const requestId = Symbol();
			pendingAudioIds.current.set(clip.id, requestId);
			requests.set(clip.id, requestId);
			void core
				.getAudioClipData(clip.id)
				.then((data) => {
					if (data == null) {
						throw new Error(`Audio data is missing for clip ${clip.id}.`);
					}
					if (cancelled) return;
					const audioBuffer = new ArrayBuffer(data.byteLength);
					new Uint8Array(audioBuffer).set(data);
					const url = URL.createObjectURL(
						new Blob([audioBuffer], { type: clip.audio_mime_type }),
					);
					const player = {
						assetId: clip.asset_id,
						audioStartFrame: clip.audio_start_frame,
						audio: new Audio(url),
						url,
						failed: false,
					};
					setAudioPlayers((players) => {
						const next = new Map(players);
						next.set(clip.id, player);
						return next;
					});
				})
				.catch((error: unknown) => {
					if (!cancelled) {
						console.error(`Failed to load audio clip ${clip.id}.`, error);
					}
				})
				.finally(() => {
					if (pendingAudioIds.current.get(clip.id) === requestId) {
						pendingAudioIds.current.delete(clip.id);
					}
				});
		}

		return () => {
			cancelled = true;
			for (const [id, requestId] of requests) {
				if (pendingAudioIds.current.get(id) === requestId) {
					pendingAudioIds.current.delete(id);
				}
			}
		};
	}, [audioPlayers, clips, core]);

	useEffect(
		() => () => {
			for (const player of audioPlayersRef.current.values()) {
				player.audio.pause();
				URL.revokeObjectURL(player.url);
			}
		},
		[],
	);

	useEffect(() => {
		const frameRate = Math.max(project.settings?.frameRate ?? 1, 1);
		const layerVisibility = new Map(
			layers.map((layer) => [layer.id, layer.visible]),
		);
		for (const clip of clips) {
			if (clip.clip_type !== "audio") continue;
			const player = audioPlayers.get(clip.id);
			if (player == null) continue;

			const isActive =
				isPlaying &&
				!clip.hidden &&
				layerVisibility.get(clip.layer_id) !== false &&
				currentFrame >= clip.start &&
				currentFrame < clip.start + clip.duration;
			if (!isActive) {
				player.audio.pause();
				player.failed = false;
				continue;
			}

			const startFrameChanged =
				player.audioStartFrame !== clip.audio_start_frame;
			const targetTime =
				(clip.audio_start_frame + currentFrame - clip.start) / frameRate;
			if (player.audio.paused) {
				player.audio.currentTime = targetTime;
				player.audioStartFrame = clip.audio_start_frame;
				if (!player.failed) {
					void player.audio.play().catch((error: unknown) => {
						player.failed = true;
						console.error(`Failed to play audio clip ${clip.id}.`, error);
					});
				}
			} else if (
				startFrameChanged ||
				Math.abs(player.audio.currentTime - targetTime) > 0.2
			) {
				player.audio.currentTime = targetTime;
				player.audioStartFrame = clip.audio_start_frame;
			}
		}
	}, [
		audioPlayers,
		clips,
		currentFrame,
		isPlaying,
		layers,
		project.settings?.frameRate,
	]);

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
	const renderLayerFrame = (frameIndex: number, layerId: string) =>
		core.renderLayerFrame(frameIndex, layerId);

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
				renderLayerFrame,
				renderFrameToCanvas,
			}}
		>
			{children}
		</PlaybackContext>
	);
};
