import { useCallback, useEffect, useRef, useState } from "react";
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
	const [selection, setSelectionState] = useState<SelectionArea>();
	const selectionRef = useRef<SelectionArea | undefined>(undefined);
	const lastSelectionRef = useRef<SelectionArea | undefined>(undefined);
	const preserveSelectionOnPlayheadChange = useRef(false);
	const preserveEmptySelection = useRef(false);
	const selectionAnchorId = useRef<string | undefined>(undefined);
	const selectionContext = useRef({
		layerId: currentLayerId,
		frame: currentFrame,
	});

	const setSelection = useCallback(
		(nextSelection: SelectionArea | undefined) => {
			if (nextSelection == null && selectionRef.current != null) {
				lastSelectionRef.current = selectionRef.current;
			}
			selectionRef.current = nextSelection;
			setSelectionState(nextSelection);
		},
		[],
	);

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

	const reselect = () => {
		if (lastSelectionRef.current != null) {
			setSelection(lastSelectionRef.current);
		}
	};

	const invertSelection = () => {
		if (compositionSettings == null) return;
		const { width, height } = compositionSettings;
		const currentSelection = selectionRef.current;
		const mask = new Uint8Array(width * height);
		mask.fill(1);

		if (currentSelection != null) {
			const startX = Math.max(0, currentSelection.x);
			const startY = Math.max(0, currentSelection.y);
			const endX = Math.min(width, currentSelection.x + currentSelection.width);
			const endY = Math.min(
				height,
				currentSelection.y + currentSelection.height,
			);
			for (let y = startY; y < endY; y++) {
				for (let x = startX; x < endX; x++) {
					const index = y * width + x;
					if (
						currentSelection.mask == null ||
						currentSelection.mask[index] === 1
					) {
						mask[index] = 0;
					}
				}
			}
		}

		setSelection({ x: 0, y: 0, width, height, mask });
	};

	const modifySelection = (amount: number) => {
		if (compositionSettings == null || selectionRef.current == null) return;
		if (!Number.isFinite(amount) || amount === 0) return;

		const { width, height } = compositionSettings;
		const currentSelection = selectionRef.current;
		const expand = amount > 0;
		const radius = Math.min(
			Math.trunc(Math.abs(amount)),
			Math.max(width, height),
		);
		if (radius === 0) return;

		const source = currentSelection.mask ?? new Uint8Array(width * height);
		if (currentSelection.mask == null) {
			const startX = Math.max(0, currentSelection.x);
			const startY = Math.max(0, currentSelection.y);
			const endX = Math.min(width, currentSelection.x + currentSelection.width);
			const endY = Math.min(
				height,
				currentSelection.y + currentSelection.height,
			);
			for (let y = startY; y < endY; y++) {
				source.fill(1, y * width + startX, y * width + endX);
			}
		}

		const horizontal = new Uint8Array(width * height);
		const mask = new Uint8Array(width * height);
		let left = width;
		let top = height;
		let right = -1;
		let bottom = -1;

		for (let y = 0; y < height; y++) {
			let count = 0;
			for (let x = 0; x <= Math.min(width - 1, radius); x++) {
				count += source[y * width + x] === 1 ? 1 : 0;
			}
			for (let x = 0; x < width; x++) {
				if (
					expand
						? count > 0
						: x >= radius && x + radius < width && count === radius * 2 + 1
				) {
					horizontal[y * width + x] = 1;
				}
				const leavingX = x - radius;
				const enteringX = x + radius + 1;
				if (leavingX >= 0) {
					count -= source[y * width + leavingX] === 1 ? 1 : 0;
				}
				if (enteringX < width) {
					count += source[y * width + enteringX] === 1 ? 1 : 0;
				}
			}
		}

		for (let x = 0; x < width; x++) {
			let count = 0;
			for (let y = 0; y <= Math.min(height - 1, radius); y++) {
				count += horizontal[y * width + x] === 1 ? 1 : 0;
			}
			for (let y = 0; y < height; y++) {
				const index = y * width + x;
				if (
					expand
						? count > 0
						: y >= radius && y + radius < height && count === radius * 2 + 1
				) {
					mask[index] = 1;
					left = Math.min(left, x);
					top = Math.min(top, y);
					right = Math.max(right, x);
					bottom = Math.max(bottom, y);
				}
				const leavingY = y - radius;
				const enteringY = y + radius + 1;
				if (leavingY >= 0) {
					count -= horizontal[leavingY * width + x] === 1 ? 1 : 0;
				}
				if (enteringY < height) {
					count += horizontal[enteringY * width + x] === 1 ? 1 : 0;
				}
			}
		}

		if (right < left || bottom < top) {
			setSelection(undefined);
			return;
		}

		setSelection({
			x: left,
			y: top,
			width: right - left + 1,
			height: bottom - top + 1,
			mask,
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
		setSelection,
	]);

	return {
		selectedClipId,
		selectedClipIds,
		selection,
		setSelection,
		selectClip,
		selectClips,
		selectAll,
		reselect,
		canReselect: lastSelectionRef.current != null,
		invertSelection,
		modifySelection,
		markClipSelected,
	};
};
