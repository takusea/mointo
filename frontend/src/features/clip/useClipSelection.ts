import { useEffect, useRef, useState } from "react";
import type { ClipMetadata } from "~/lib/clip";
import type { LayerId } from "~/lib/layer";

type SelectionRectangle = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type CompositionSettings = {
	width: number;
	height: number;
} | null;

type Options = {
	clips: ClipMetadata[];
	currentClip: ClipMetadata | undefined;
	currentLayerId: LayerId | null;
	currentFrame: number;
	selectLayer: (layerId: LayerId) => void;
	compositionSettings: CompositionSettings | undefined;
};

export const useClipSelection = ({
	clips,
	currentClip,
	currentLayerId,
	currentFrame,
	selectLayer,
	compositionSettings,
}: Options) => {
	const [selectedClipId, setSelectedClipId] = useState<string>();
	const [selection, setSelection] = useState<SelectionRectangle>();
	const selectionContext = useRef({
		layerId: currentLayerId,
		frame: currentFrame,
	});

	const markClipSelected = (
		id: string,
		layerId: LayerId,
		shouldSelectLayer = false,
	) => {
		selectionContext.current = { layerId, frame: currentFrame };
		if (shouldSelectLayer) selectLayer(layerId);
		setSelectedClipId(id);
	};

	const selectClip = (id: string) => {
		const clip = clips.find((candidate) => candidate.id === id);
		setSelectedClipId(id);
		if (clip != null) {
			selectionContext.current = {
				layerId: clip.layer_id,
				frame: currentFrame,
			};
			selectLayer(clip.layer_id);
		}
	};

	const selectAll = () => {
		if (compositionSettings == null) return;
		setSelection({
			x: 0,
			y: 0,
			width: compositionSettings.width,
			height: compositionSettings.height,
		});
	};

	useEffect(() => {
		const playheadChanged =
			selectionContext.current.layerId !== currentLayerId ||
			selectionContext.current.frame !== currentFrame;
		if (playheadChanged) setSelection(undefined);
		selectionContext.current = {
			layerId: currentLayerId,
			frame: currentFrame,
		};
		if (
			!playheadChanged &&
			selectedClipId != null &&
			clips.some((clip) => clip.id === selectedClipId)
		) {
			return;
		}
		setSelectedClipId(currentClip?.id);
	}, [clips, currentClip, currentFrame, currentLayerId, selectedClipId]);

	return {
		selectedClipId,
		selection,
		setSelection,
		selectClip,
		selectAll,
		markClipSelected,
	};
};
