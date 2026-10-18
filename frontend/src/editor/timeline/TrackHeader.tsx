import { useRef } from "react";
import { useI18n } from "~/features/i18n/useI18n";
import { MAX_FRAME_INDEX } from "~/features/project/type";

type Props = {
	currentFrame: number;
	startFrame: number;
	endFrame: number;
	totalFrames: number;
	frameWidth: number;
	scrollX: number;
	onFrameChange: (frame: number) => void;
	onStartFrameChange: (frame: number) => void;
	onEndFrameChange: (frame: number) => void;
	onFrameFocus: (frame: number) => void;
	onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
};

const TrackHeader = ({
	currentFrame,
	startFrame,
	endFrame,
	totalFrames,
	frameWidth,
	scrollX,
	onFrameChange,
	onStartFrameChange,
	onEndFrameChange,
	onFrameFocus,
	onWheel,
}: Props) => {
	const { t } = useI18n();
	const handleDragOffset = useRef(0);

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		if (!(event.buttons & 1)) return;
		event.currentTarget.setPointerCapture(event.pointerId);

		const rect = event.currentTarget.getBoundingClientRect();
		const startFrame = Math.floor((event.clientX - rect.left) / frameWidth);
		onFrameChange(Math.max(0, startFrame));
	}

	function handleRangePointerDown(
		event: React.PointerEvent<HTMLButtonElement>,
		frame: number,
	) {
		event.stopPropagation();
		const header = event.currentTarget.parentElement;
		if (header == null) return;
		handleDragOffset.current =
			frame * frameWidth -
			(event.clientX - header.getBoundingClientRect().left);
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function handleRangePointerMove(
		event: React.PointerEvent<HTMLButtonElement>,
		isStart: boolean,
	) {
		if (!(event.buttons & 1)) return;
		event.stopPropagation();

		const header = event.currentTarget.parentElement;
		if (header == null) return;
		const rect = header.getBoundingClientRect();
		const boundary = event.clientX - rect.left + handleDragOffset.current;
		if (isStart) {
			const frame = Math.floor(boundary / frameWidth);
			onStartFrameChange(Math.max(0, Math.min(frame, endFrame)));
			return;
		}

		const frame = Math.ceil(boundary / frameWidth) - 1;
		onEndFrameChange(Math.min(MAX_FRAME_INDEX, Math.max(frame, startFrame)));
	}

	function handleRangeKeyDown(
		event: React.KeyboardEvent<HTMLButtonElement>,
		isStart: boolean,
	) {
		const currentFrame = isStart ? startFrame : endFrame;
		const minFrame = isStart ? 0 : startFrame;
		const maxFrame = isStart ? endFrame : totalFrames - 1;
		let nextFrame = currentFrame;

		switch (event.key) {
			case "ArrowLeft":
				nextFrame -= 1;
				break;
			case "ArrowRight":
				nextFrame += 1;
				break;
			case "Home":
				nextFrame = minFrame;
				break;
			case "End":
				nextFrame = maxFrame;
				break;
			default:
				return;
		}

		event.preventDefault();
		event.stopPropagation();
		if (isStart) {
			const frame = Math.max(minFrame, Math.min(nextFrame, maxFrame));
			onStartFrameChange(frame);
			onFrameFocus(frame);
		} else {
			const frame = Math.max(minFrame, Math.min(nextFrame, maxFrame));
			onEndFrameChange(frame);
			onFrameFocus(frame + 1);
		}
	}

	function handleRangeFocus(
		event: React.FocusEvent<HTMLButtonElement>,
		frame: number,
	) {
		// The translated header is clipped by its grid cell. Browsers may scroll
		// that overflow-hidden cell to reveal a focused range handle, shifting
		// the header independently from TrackBody. Keep the cell fixed and let
		// Timeline scroll the shared TrackBody viewport instead.
		const clip = event.currentTarget.parentElement?.parentElement;
		if (clip != null) {
			clip.scrollLeft = 0;
			clip.scrollTop = 0;
		}
		onFrameFocus(frame);
	}

	return (
		<div
			className="h-full border-zinc-500/40 border-b"
			style={{
				translate: `-${scrollX}px 0`,
				width: `${totalFrames * frameWidth}px`,
			}}
			onPointerMove={handlePointerMove}
			onWheel={onWheel}
		>
			<div
				className="pointer-events-none absolute top-0 h-full bg-white/50 dark:bg-zinc-800/50"
				style={{
					left: `${startFrame * frameWidth}px`,
					width: `${(endFrame - startFrame + 1) * frameWidth}px`,
				}}
			/>
			{[...Array(totalFrames)].map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: Frame ticks are positional and have no persistent identity.
					key={i}
					className="absolute bottom-0 h-2 w-px bg-zinc-500/25"
					style={{ left: `${(i + 1) * frameWidth}px` }}
				/>
			))}
			<button
				type="button"
				aria-label={t("timeline.startFrame", { frame: startFrame })}
				title={t("timeline.startFrame", { frame: startFrame })}
				className="absolute top-0 z-10 h-full cursor-ew-resize touch-none border-primary border-l-2"
				style={{
					left: `${startFrame * frameWidth}px`,
				}}
				onPointerDown={(event) => handleRangePointerDown(event, startFrame)}
				onPointerMove={(event) => handleRangePointerMove(event, true)}
				onKeyDown={(event) => handleRangeKeyDown(event, true)}
				onFocus={(event) => handleRangeFocus(event, startFrame)}
			></button>
			<button
				type="button"
				aria-label={t("timeline.endFrame", { frame: endFrame })}
				title={t("timeline.endFrame", { frame: endFrame })}
				className="absolute top-0 z-10 h-full -translate-x-full cursor-ew-resize touch-none border-primary border-r-2 outline-offset-1"
				style={{
					left: `${(endFrame + 1) * frameWidth}px`,
				}}
				onPointerDown={(event) => handleRangePointerDown(event, endFrame + 1)}
				onPointerMove={(event) => handleRangePointerMove(event, false)}
				onKeyDown={(event) => handleRangeKeyDown(event, false)}
				onFocus={(event) => handleRangeFocus(event, endFrame + 1)}
			></button>
			<div
				className="pointer-events-none absolute flex h-full items-center border-primary border-b-2 px-1 outline-offset-1"
				style={{
					translate: `${currentFrame * frameWidth}px 0`,
					width: `${frameWidth}px`,
				}}
			>
				{currentFrame}
			</div>
		</div>
	);
};

export default TrackHeader;
