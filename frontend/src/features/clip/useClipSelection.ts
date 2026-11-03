import { useEffect, useRef, useState } from "react";
import type { ClipMetadata } from "~/lib/clip";
import type { LayerId } from "~/lib/layer";
import type { SelectionArea } from "./ClipContext";

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
	const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
	const [selection, setSelection] = useState<SelectionArea>();
	const preserveSelectionOnPlayheadChange = useRef(false);
	const preserveEmptySelection = useRef(false);
	const selectionAnchorId = useRef<string | undefined>(undefined);
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
		selectionAnchorId.current = id;
		setSelectedClipIds([id]);
		setSelectedClipId(id);
	};

	const selectClip = (
		id: string,
		addToSelection = false,
		preserveSelection = false,
		deferLayerSelect = false,
		selectRange = false,
		addRangeToSelection = false,
	) => {
		preserveSelectionOnPlayheadChange.current = true;
		if (selectRange) {
			const anchorId =
				selectionAnchorId.current ??
				selectedClipId ??
				selectedClipIds.at(-1) ??
				id;
			const anchorClip = clips.find((clip) => clip.id === anchorId);
			const targetClip = clips.find((clip) => clip.id === id);
			if (anchorClip != null && targetClip != null) {
				const minLayer = Math.min(
					anchorClip.layer_index,
					targetClip.layer_index,
				);
				const maxLayer = Math.max(
					anchorClip.layer_index,
					targetClip.layer_index,
				);
				const minFrame = Math.min(anchorClip.start, targetClip.start);
				const maxFrame = Math.max(anchorClip.start, targetClip.start);
				const range = clips
					.filter(
						(clip) =>
							clip.layer_index >= minLayer &&
							clip.layer_index <= maxLayer &&
							clip.start <= maxFrame &&
							clip.start + clip.duration > minFrame,
					)
					.map((clip) => clip.id);
				setSelectedClipIds(
					addRangeToSelection
						? [...new Set([...selectedClipIds, ...range])]
						: range,
				);
				setSelectedClipId(id);
				if (!deferLayerSelect) {
					selectionContext.current = {
						layerId: targetClip.layer_id,
						frame: currentFrame,
					};
					selectLayer(targetClip.layer_id);
				}
				return;
			}
		}
		if (preserveSelection && !addToSelection) {
			selectionAnchorId.current = id;
			setSelectedClipIds([id]);
			setSelectedClipId(id);
			const clip = clips.find((candidate) => candidate.id === id);
			if (clip != null && !deferLayerSelect) {
				selectionContext.current = {
					layerId: clip.layer_id,
					frame: currentFrame,
				};
				selectLayer(clip.layer_id);
			}
			return;
		}
		let nextSelectedClipId = id;
		if (addToSelection) {
			const isSelected = selectedClipIds.includes(id);
			const next = isSelected
				? selectedClipIds.filter((selectedId) => selectedId !== id)
				: [...selectedClipIds, id];
			nextSelectedClipId = isSelected
				? selectedClipId === id
					? (next.at(-1) ?? "")
					: (selectedClipId ?? "")
				: id;
			if (!isSelected) selectionAnchorId.current = id;
			setSelectedClipIds(next);
		} else {
			selectionAnchorId.current = id;
			setSelectedClipIds([id]);
		}
		setSelectedClipId(nextSelectedClipId || undefined);
		const primaryClip = clips.find(
			(candidate) => candidate.id === nextSelectedClipId,
		);
		if (primaryClip != null && !deferLayerSelect) {
			selectionContext.current = {
				layerId: primaryClip.layer_id,
				frame: currentFrame,
			};
			selectLayer(primaryClip.layer_id);
		}
	};

	const selectClips = (ids: string[]) => {
		preserveSelectionOnPlayheadChange.current = true;
		const selectedIds = ids.filter((id) =>
			clips.some((clip) => clip.id === id),
		);
		preserveEmptySelection.current = selectedIds.length === 0;
		const primaryId = selectedIds.at(-1);
		selectionAnchorId.current = primaryId;
		setSelectedClipIds(selectedIds);
		setSelectedClipId(primaryId);
		selectionContext.current = {
			layerId: currentLayerId,
			frame: currentFrame,
		};
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
		const preserveSelection = preserveSelectionOnPlayheadChange.current;
		preserveSelectionOnPlayheadChange.current = false;
		if (preserveEmptySelection.current) {
			preserveEmptySelection.current = false;
			selectionContext.current = {
				layerId: currentLayerId,
				frame: currentFrame,
			};
			if (playheadChanged) setSelection(undefined);
			return;
		}
		if (playheadChanged) setSelection(undefined);
		selectionContext.current = {
			layerId: currentLayerId,
			frame: currentFrame,
		};
		const existingSelectedIds = selectedClipIds.filter((id) =>
			clips.some((clip) => clip.id === id),
		);
		if (
			playheadChanged &&
			preserveSelection &&
			existingSelectedIds.length === selectedClipIds.length
		) {
			return;
		}
		if (
			selectedClipIds.length > 1 &&
			existingSelectedIds.length === selectedClipIds.length
		) {
			return;
		}
		if (
			!playheadChanged &&
			selectedClipId != null &&
			clips.some((clip) => clip.id === selectedClipId)
		) {
			if (existingSelectedIds.length !== selectedClipIds.length) {
				setSelectedClipIds(existingSelectedIds);
			}
			return;
		}
		setSelectedClipIds(currentClip == null ? [] : [currentClip.id]);
		setSelectedClipId(currentClip?.id);
	}, [
		clips,
		currentClip,
		currentFrame,
		currentLayerId,
		selectedClipId,
		selectedClipIds,
	]);

	return {
		selectedClipId,
		selectedClipIds,
		selection,
		setSelection,
		selectClip,
		selectClips,
		selectAll,
		markClipSelected,
	};
};
