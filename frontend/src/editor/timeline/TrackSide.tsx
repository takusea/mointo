import {
	IconEye,
	IconEyeOff,
	IconLock,
	IconLockOpen,
} from "@tabler/icons-react";
import { useRef } from "react";
import IconButton from "~/components/IconButton";
import { useI18n } from "~/features/i18n/useI18n";
import type { LayerId, LayerState } from "~/lib/layer";

type Props = {
	layers: LayerState[];
	layerHeight: number;
	scrollY: number;
	selectedLayerId: LayerId | null;
	onLayerSelect: (id: LayerId) => void;
	onLayerShow: (id: LayerId) => void;
	onLayerHide: (id: LayerId) => void;
	onLayerLockToggle: (id: LayerId) => void;
	onLayerFocus: (index: number) => void;
	onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
};

const TrackSide = ({
	layers,
	layerHeight,
	scrollY,
	selectedLayerId,
	onLayerSelect,
	onLayerShow,
	onLayerHide,
	onLayerLockToggle,
	onLayerFocus,
	onWheel,
}: Props) => {
	const { t } = useI18n();
	const sideRef = useRef<HTMLDivElement | null>(null);

	function handleControlKeyDown(
		event: React.KeyboardEvent<HTMLButtonElement>,
		layerIndex: number,
		controlIndex: number,
	) {
		const offsets: Record<string, [number, number]> = {
			ArrowUp: [-1, 0],
			ArrowDown: [1, 0],
			ArrowLeft: [0, -1],
			ArrowRight: [0, 1],
		};
		const offset = offsets[event.key];
		if (offset == null) return;

		event.preventDefault();
		event.stopPropagation();
		const [layerOffset, controlOffset] = offset;
		const nextLayerIndex = layerIndex + layerOffset;
		const nextControlIndex = controlIndex + controlOffset;
		if (
			nextLayerIndex < 0 ||
			nextLayerIndex >= layers.length ||
			nextControlIndex < 0 ||
			nextControlIndex > 2
		) {
			return;
		}

		const nextButton = sideRef.current?.querySelector<HTMLButtonElement>(
			`[data-layer-index="${nextLayerIndex}"][data-control-index="${nextControlIndex}"]`,
		);
		nextButton?.focus({ preventScroll: true });
		if (nextButton != null) onLayerFocus(nextLayerIndex);
	}

	return (
		<div
			ref={sideRef}
			className="border-zinc-500/40 border-r"
			style={{
				translate: `0 -${scrollY}px`,
				height: `${layers.length * layerHeight}px`,
			}}
			onWheel={onWheel}
		>
			{layers.map((layer, i) => {
				const isHidden = !layer.visible;
				const isLocked = layer.locked;
				return (
					<div
						key={layer.id}
						className={`flex items-center justify-between gap-1 overflow-hidden border-zinc-500/40 border-b ${isHidden ? "opacity-50" : ""}`}
						style={{ height: `${layerHeight}px` }}
					>
						{selectedLayerId === layer.id && (
							<div className="absolute left-1 h-4 w-1 rounded-full bg-primary" />
						)}
						<button
							type="button"
							className="h-full flex-1 pr-2 pl-3 text-left"
							tabIndex={i === 0 ? 0 : -1}
							data-layer-index={i}
							data-control-index={0}
							onClick={() => onLayerSelect(layer.id)}
							onFocus={() => onLayerFocus(i)}
							onKeyDown={(event) => handleControlKeyDown(event, i, 0)}
						>
							{t("timeline.layer", { index: i })}
						</button>
						<IconButton
							label={t(isHidden ? "timeline.showLayer" : "timeline.hideLayer", {
								index: i,
							})}
							icon={isHidden ? IconEyeOff : IconEye}
							variant={isHidden ? "primary" : "default"}
							aria-pressed={isHidden}
							tabIndex={-1}
							data-layer-index={i}
							data-control-index={1}
							onKeyDown={(event) => handleControlKeyDown(event, i, 1)}
							onClick={() =>
								isHidden ? onLayerShow(layer.id) : onLayerHide(layer.id)
							}
						/>
						<IconButton
							label={t(
								isLocked ? "timeline.unlockLayer" : "timeline.lockLayer",
								{ index: i },
							)}
							icon={isLocked ? IconLock : IconLockOpen}
							aria-pressed={isLocked}
							tabIndex={-1}
							data-layer-index={i}
							data-control-index={2}
							onKeyDown={(event) => handleControlKeyDown(event, i, 2)}
							variant={isLocked ? "primary" : "default"}
							onClick={() => onLayerLockToggle(layer.id)}
						/>
					</div>
				);
			})}
		</div>
	);
};

export default TrackSide;
