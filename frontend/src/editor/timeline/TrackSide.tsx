import {
	IconEye,
	IconEyeOff,
	IconLock,
	IconLockOpen,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import IconButton from "~/components/IconButton";
import { useI18n } from "~/features/i18n/useI18n";
import type { LayerId, LayerState } from "~/lib/layer";

type Props = {
	layers: LayerState[];
	layerHeight: number;
	scrollY: number;
	selectedLayerId: LayerId | null;
	isCollapsed: boolean;
	onLayerSelect: (id: LayerId) => void;
	onLayerShow: (id: LayerId) => void;
	onLayerHide: (id: LayerId) => void;
	onLayerLockToggle: (id: LayerId) => void;
	onLayersSwap: (sourceId: LayerId, targetId: LayerId) => void;
	onLayerFocus: (index: number) => void;
	onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
};

type LayerDrag = {
	pointerId: number;
	layerId: LayerId;
	sourceIndex: number;
	startY: number;
	isDragging: boolean;
};

const TrackSide = ({
	layers,
	layerHeight,
	scrollY,
	selectedLayerId,
	isCollapsed,
	onLayerSelect,
	onLayerShow,
	onLayerHide,
	onLayerLockToggle,
	onLayersSwap,
	onLayerFocus,
	onWheel,
}: Props) => {
	const { t } = useI18n();
	const sideRef = useRef<HTMLDivElement | null>(null);
	const layerDragRef = useRef<LayerDrag | null>(null);
	const [draggedLayerId, setDraggedLayerId] = useState<LayerId | null>(null);
	const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

	function getLayerIndexAtPointer(clientY: number) {
		const side = sideRef.current;
		if (side == null) return -1;
		const index = Math.floor(
			(clientY - side.getBoundingClientRect().top) / layerHeight,
		);
		return index >= 0 && index < layers.length ? index : -1;
	}

	function handleLayerDragStart(
		event: React.PointerEvent<HTMLSpanElement>,
		layerId: LayerId,
		layerIndex: number,
	) {
		if (event.button !== 0) return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		layerDragRef.current = {
			pointerId: event.pointerId,
			layerId,
			sourceIndex: layerIndex,
			startY: event.clientY,
			isDragging: false,
		};
	}

	function handleLayerDragMove(event: React.PointerEvent<HTMLSpanElement>) {
		const drag = layerDragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) return;
		if (!drag.isDragging) {
			drag.isDragging = Math.abs(event.clientY - drag.startY) >= 3;
		}
		if (!drag.isDragging) return;
		setDraggedLayerId(drag.layerId);
		setDropTargetIndex(getLayerIndexAtPointer(event.clientY));
	}

	function finishLayerDrag(event: React.PointerEvent<HTMLSpanElement>) {
		const drag = layerDragRef.current;
		if (drag == null || drag.pointerId !== event.pointerId) return;
		layerDragRef.current = null;
		setDraggedLayerId(null);
		setDropTargetIndex(null);
		if (!drag.isDragging || event.type === "pointercancel") return;

		const targetIndex = getLayerIndexAtPointer(event.clientY);
		const targetLayer = layers[targetIndex];
		if (targetLayer != null && targetIndex !== drag.sourceIndex) {
			onLayersSwap(drag.layerId, targetLayer.id);
		}
	}

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
						data-hidden={isHidden}
						data-selected={selectedLayerId === layer.id}
						data-dragged={draggedLayerId === layer.id}
						data-drop-target={dropTargetIndex === i}
						className="relative flex items-center justify-between gap-1 overflow-hidden border-b border-border data-[dragged=true]:opacity-40 data-[drop-target=true]:bg-clear-hover data-[hidden=true]:opacity-50 data-[selected=true]:bg-clear-active"
						style={{ height: `${layerHeight}px` }}
					>
						{selectedLayerId === layer.id && (
							<div className="absolute left-1 h-4 w-1 rounded-full bg-primary" />
						)}
						<button
							type="button"
							className={
								isCollapsed
									? "h-full w-full cursor-grab text-center font-medium active:cursor-grabbing"
									: "h-full flex-1 cursor-grab pr-2 pl-3 text-left font-medium active:cursor-grabbing"
							}
							aria-label={
								isCollapsed ? t("timeline.layer", { index: i }) : undefined
							}
							tabIndex={i === 0 ? 0 : -1}
							data-layer-index={i}
							data-control-index={0}
							onClick={() => onLayerSelect(layer.id)}
							onFocus={() => onLayerFocus(i)}
							onKeyDown={(event) => handleControlKeyDown(event, i, 0)}
							onPointerDown={(event) =>
								handleLayerDragStart(event, layer.id, i)
							}
							onPointerMove={handleLayerDragMove}
							onPointerUp={finishLayerDrag}
							onPointerCancel={finishLayerDrag}
						>
							{isCollapsed ? i : t("timeline.layer", { index: i })}
						</button>
						{!isCollapsed && (
							<>
								<IconButton
									label={t(
										isHidden ? "timeline.showLayer" : "timeline.hideLayer",
										{
											index: i,
										},
									)}
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
							</>
						)}
					</div>
				);
			})}
		</div>
	);
};

export default TrackSide;
