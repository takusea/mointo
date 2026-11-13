import type { ClipMetadata } from "~/lib/clip";
import type { LayerId, LayerState } from "~/lib/layer";

export const findAvailableLayer = (
	layers: LayerState[],
	clips: ClipMetadata[],
	startingLayerId: LayerId,
	start: number,
	duration: number,
) => {
	const startingLayerIndex = layers.findIndex(
		(layer) => layer.id === startingLayerId,
	);
	if (startingLayerIndex < 0) return undefined;

	const end = start + duration;
	return layers
		.slice(startingLayerIndex)
		.find(
			(layer) =>
				!layer.locked &&
				!clips.some(
					(clip) =>
						clip.layer_id === layer.id &&
						clip.start < end &&
						start < clip.start + clip.duration,
				),
		);
};
