import {
	IconEye,
	IconEyeOff,
	IconLock,
	IconLockOpen,
} from "@tabler/icons-react";
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
	onWheel,
}: Props) => {
	const { t } = useI18n();

	return (
		<div
			className="border-r border-zinc-500/40"
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
						className={`overflow-hidden flex items-center justify-between gap-1 border-b border-zinc-500/40 ${isHidden ? "opacity-50" : ""}`}
						style={{ height: `${layerHeight}px` }}
					>
						{selectedLayerId === layer.id && (
							<div className="absolute left-1 w-1 h-4 bg-primary rounded-full" />
						)}
						<button
							type="button"
							className="flex-1 h-full pl-3 pr-2 text-left"
							onClick={() => onLayerSelect(layer.id)}
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
