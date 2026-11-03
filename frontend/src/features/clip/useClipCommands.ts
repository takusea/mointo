import { useRef } from "react";
import { useCore } from "~/core/useCore";
import type { ClipMetadata, ClipProperties } from "~/lib/clip";
import type { LayerId, LayerState } from "~/lib/layer";

type Options = {
	clips: ClipMetadata[];
	layers: LayerState[];
	selectedClipId: string | undefined;
	selectedClipIds: string[];
	isLayerLocked: (layerId: LayerId) => boolean;
	onClipSelected: (
		id: string,
		layerId: LayerId,
		shouldSelectLayer?: boolean,
	) => void;
	onClipsSelected: (ids: string[]) => void;
};

export const useClipCommands = ({
	clips,
	layers,
	selectedClipId,
	selectedClipIds,
	isLayerLocked,
	onClipSelected,
	onClipsSelected,
}: Options) => {
	const core = useCore();
	const dragBaselineRef = useRef<{
		gestureId: string;
		clips: Map<string, { start: number; duration: number; layerIndex: number }>;
	} | null>(null);
	const getSelectedClips = (id: string) => {
		const ids = selectedClipIds.includes(id) ? selectedClipIds : [id];
		return ids.flatMap((selectedId) => {
			const clip = clips.find((candidate) => candidate.id === selectedId);
			return clip == null ? [] : [clip];
		});
	};

	const addClip = async (start: number, layerId: LayerId) => {
		if (isLayerLocked(layerId)) return;
		const nextClips = await core.addClip(start, layerId);
		const clip = nextClips.find(
			(candidate) =>
				candidate.start === start && candidate.layer_id === layerId,
		);
		if (clip != null) onClipSelected(clip.id, layerId, true);
	};

	const ensureClipAt = async (frame: number, layerId: LayerId | null) => {
		if (layerId == null || isLayerLocked(layerId)) return undefined;

		const existingClip = clips.find(
			(clip) =>
				clip.layer_id === layerId &&
				clip.start <= frame &&
				frame < clip.start + clip.duration,
		);
		if (existingClip != null) {
			onClipSelected(existingClip.id, layerId);
			return existingClip.id;
		}

		const nextClips = await core.addClip(frame, layerId);
		const newClip = nextClips.find(
			(clip) =>
				clip.start === frame &&
				clip.layer_id === layerId &&
				!clips.some((existing) => existing.id === clip.id),
		);
		if (newClip == null) return undefined;
		onClipSelected(newClip.id, layerId);
		return newClip.id;
	};

	const duplicateClip = async (id: string | undefined, linkImage = false) => {
		const sources = getSelectedClips(id ?? "").filter(
			(clip) => !clip.locked && !isLayerLocked(clip.layer_id),
		);
		if (sources.length === 0) return;

		const minimumStart = Math.min(...sources.map((clip) => clip.start));
		let offset =
			Math.max(...sources.map((clip) => clip.start + clip.duration)) -
			minimumStart;
		const obstacles = clips.filter(
			(candidate) => !sources.some((source) => source.id === candidate.id),
		);
		while (true) {
			const collisions = sources.flatMap((source) =>
				obstacles
					.filter(
						(candidate) =>
							candidate.layer_id === source.layer_id &&
							source.start + offset < candidate.start + candidate.duration &&
							candidate.start < source.start + offset + source.duration,
					)
					.map((candidate) => ({ source, candidate })),
			);
			if (collisions.length === 0) break;
			offset = Math.max(
				offset + 1,
				...collisions.map(
					({ source, candidate }) =>
						candidate.start + candidate.duration - source.start,
				),
			);
		}

		const existingIds = new Set(clips.map((candidate) => candidate.id));
		const duplicateIds: string[] = [];
		await core.beginActionGroup();
		try {
			for (const source of sources) {
				const start = source.start + offset;
				const nextClips = await core.addClip(start, source.layer_id);
				const duplicate = nextClips.find(
					(candidate) =>
						!existingIds.has(candidate.id) &&
						candidate.layer_id === source.layer_id &&
						candidate.start === start,
				);
				if (duplicate == null) continue;
				existingIds.add(duplicate.id);
				duplicateIds.push(duplicate.id);

				await core.changeClipDuration(duplicate.id, source.duration);
				await core.changeClipName(duplicate.id, source.name);
				await core.changeClipSize(duplicate.id, source.width, source.height);
				await core.changeClipProperties(duplicate.id, {
					hidden: source.hidden,
					alpha_locked: source.alpha_locked,
					locked: source.locked,
					opacity: source.opacity,
					blend_mode: source.blend_mode,
				});
				if (linkImage) {
					await core.linkClips(source.id, duplicate.id);
				} else {
					const pixels = await core.getClipPixels(source.id);
					if (pixels != null)
						await core.replaceClipPixels(duplicate.id, pixels);
				}
			}
		} finally {
			await core.endActionGroup();
		}
		if (duplicateIds.length > 0) onClipsSelected(duplicateIds);
	};

	const duplicateLinkedClip = (id: string | undefined) =>
		duplicateClip(id, true);

	const getMergeSources = () => {
		const selectedIds = new Set([
			...selectedClipIds,
			...(selectedClipId == null ? [] : [selectedClipId]),
		]);
		const sources = clips.filter((clip) => selectedIds.has(clip.id));
		if (sources.length < 2) return [];

		if (sources.some((clip) => clip.locked || isLayerLocked(clip.layer_id))) {
			return [];
		}

		return sources;
	};

	const mergeSelectedClips = async () => {
		const sources = getMergeSources();
		if (sources.length < 2) return;

		const target = sources.reduce((bottommost, clip) =>
			clip.layer_index < bottommost.layer_index ? clip : bottommost,
		);
		const { start, duration } = target;
		const pixels = await core.renderSelectedClips(
			sources.map((clip) => clip.id),
			start,
		);
		if (pixels == null) {
			throw new Error("Could not render the selected clips for merging.");
		}

		const existingIds = new Set(clips.map((clip) => clip.id));
		await core.beginActionGroup();
		let changed = false;
		let mergedId: string | undefined;
		try {
			const nextClips = await core.addClip(start, target.layer_id);
			changed = true;
			const mergedClip = nextClips.find(
				(clip) =>
					!existingIds.has(clip.id) &&
					clip.start === start &&
					clip.layer_id === target.layer_id,
			);
			if (mergedClip == null) {
				throw new Error("Could not create the merged clip.");
			}
			mergedId = mergedClip.id;
			await core.changeClipDuration(mergedClip.id, duration);
			await core.replaceClipPixels(mergedClip.id, pixels);
			for (const source of sources) await core.deleteClip(source.id);
		} catch (error) {
			await core.endActionGroup();
			if (changed) await core.undo();
			throw error;
		}
		await core.endActionGroup();
		if (mergedId != null) onClipSelected(mergedId, target.layer_id, true);
	};

	const deleteClip = async (id: string) => {
		const targets = getSelectedClips(id).filter(
			(clip) => !isLayerLocked(clip.layer_id),
		);
		if (targets.length === 0) return;
		await core.beginActionGroup();
		try {
			for (const clip of targets) await core.deleteClip(clip.id);
		} finally {
			await core.endActionGroup();
		}
	};

	const moveClip = async (
		id: string,
		start: number,
		layerId: LayerId,
		frameDelta?: number,
		layerDelta?: number,
		gestureId?: string,
	) => {
		const clip = clips.find((candidate) => candidate.id === id);
		if (clip == null) return;
		if (gestureId != null && dragBaselineRef.current?.gestureId !== gestureId) {
			dragBaselineRef.current = {
				gestureId,
				clips: new Map(
					getSelectedClips(id).map((selectedClip) => [
						selectedClip.id,
						{
							start: selectedClip.start,
							duration: selectedClip.duration,
							layerIndex: selectedClip.layer_index,
						},
					]),
				),
			};
		}
		const baselineState = dragBaselineRef.current;
		const baselines =
			gestureId != null && baselineState?.gestureId === gestureId
				? baselineState.clips
				: undefined;
		const frameOffset = frameDelta ?? start - clip.start;
		const selectedClips = getSelectedClips(id).filter(
			(selectedClip) =>
				!selectedClip.locked && !isLayerLocked(selectedClip.layer_id),
		);
		if (selectedClips.length === 0) return;
		const requestedLayerDelta =
			layerDelta ??
			layers.findIndex((layer) => layer.id === layerId) -
				(baselines?.get(id)?.layerIndex ?? clip.layer_index);
		const targetLayerIndex = Math.max(
			...selectedClips.map(
				(selectedClip) =>
					-(
						baselines?.get(selectedClip.id)?.layerIndex ??
						selectedClip.layer_index
					),
			),
			Math.min(
				...selectedClips.map(
					(selectedClip) =>
						layers.length -
						1 -
						(baselines?.get(selectedClip.id)?.layerIndex ??
							selectedClip.layer_index),
				),
				requestedLayerDelta,
			),
		);
		const movingClips = selectedClips.flatMap((selectedClip) => {
			const baseline = baselines?.get(selectedClip.id) ?? {
				start: selectedClip.start,
				duration: selectedClip.duration,
				layerIndex: selectedClip.layer_index,
			};
			const targetLayer = layers[baseline.layerIndex + targetLayerIndex];
			if (targetLayer == null || isLayerLocked(targetLayer.id)) return [];
			return [{ clip: selectedClip, targetLayer, baseline }];
		});
		if (movingClips.length === 0) return;

		const movingIds = new Set(movingClips.map(({ clip }) => clip.id));
		const obstacles = clips.filter((candidate) => !movingIds.has(candidate.id));
		const minimumOffset = Math.max(
			...movingClips.map(({ baseline }) => -baseline.start),
		);
		const candidates = new Set([
			frameOffset,
			minimumOffset,
			...movingClips.flatMap(({ targetLayer, baseline }) =>
				obstacles
					.filter((candidate) => candidate.layer_id === targetLayer.id)
					.flatMap((candidate) => [
						candidate.start - baseline.duration - baseline.start,
						candidate.start + candidate.duration - baseline.start,
					]),
			),
		]);
		const validOffsets = [...candidates].filter(
			(offset) =>
				offset >= minimumOffset &&
				movingClips.every(({ baseline, targetLayer }) =>
					obstacles
						.filter((candidate) => candidate.layer_id === targetLayer.id)
						.every(
							(candidate) =>
								baseline.start + offset >=
									candidate.start + candidate.duration ||
								candidate.start >= baseline.start + offset + baseline.duration,
						),
				),
		);
		const direction = Math.sign(frameOffset);
		const adjustedOffset = validOffsets.reduce((closest, candidate) => {
			const difference =
				Math.abs(candidate - frameOffset) - Math.abs(closest - frameOffset);
			if (difference !== 0) return difference < 0 ? candidate : closest;
			return direction * (candidate - closest) > 0 ? candidate : closest;
		}, validOffsets[0] ?? minimumOffset);
		for (const { clip: selectedClip, targetLayer } of movingClips) {
			const baseline = baselines?.get(selectedClip.id) ?? {
				start: selectedClip.start,
				duration: selectedClip.duration,
				layerIndex: selectedClip.layer_index,
			};
			await core.moveClip(
				selectedClip.id,
				Math.max(0, baseline.start + adjustedOffset),
				targetLayer.id,
			);
		}
	};

	const changeClipDuration = async (
		id: string,
		duration: number,
		durationDelta?: number,
		gestureId?: string,
	) => {
		if (gestureId != null && dragBaselineRef.current?.gestureId !== gestureId) {
			dragBaselineRef.current = {
				gestureId,
				clips: new Map(
					getSelectedClips(id).map((selectedClip) => [
						selectedClip.id,
						{
							start: selectedClip.start,
							duration: selectedClip.duration,
							layerIndex: selectedClip.layer_index,
						},
					]),
				),
			};
		}
		const baselineState = dragBaselineRef.current;
		const baselines =
			gestureId != null && baselineState?.gestureId === gestureId
				? baselineState.clips
				: undefined;
		for (const clip of getSelectedClips(id)) {
			if (clip.locked || isLayerLocked(clip.layer_id)) continue;
			const requestedDuration =
				durationDelta == null
					? duration
					: (baselines?.get(clip.id)?.duration ?? clip.duration) +
						durationDelta;
			const nextClipStart = clips.reduce(
				(earliest, candidate) =>
					candidate.id !== clip.id &&
					candidate.layer_id === clip.layer_id &&
					candidate.start >= clip.start
						? Math.min(earliest, candidate.start)
						: earliest,
				Number.POSITIVE_INFINITY,
			);
			await core.changeClipDuration(
				clip.id,
				Math.max(1, Math.min(requestedDuration, nextClipStart - clip.start)),
			);
		}
	};

	const changeClipName = async (id: string, name: string) => {
		if (name.trim().length === 0) return;
		for (const clip of getSelectedClips(id)) {
			if (!clip.locked && !isLayerLocked(clip.layer_id))
				await core.changeClipName(clip.id, name.trim());
		}
	};

	const changeClipSize = async (
		id: string,
		width: number,
		height: number,
		dimension?: "width" | "height",
	) => {
		for (const clip of getSelectedClips(id)) {
			if (clip.locked || isLayerLocked(clip.layer_id)) continue;
			await core.changeClipSize(
				clip.id,
				Math.max(1, Math.floor(dimension === "height" ? clip.width : width)),
				Math.max(1, Math.floor(dimension === "width" ? clip.height : height)),
			);
		}
	};

	const changeClipProperties = async (
		id: string,
		properties: Partial<ClipProperties>,
	) => {
		for (const clip of getSelectedClips(id)) {
			if (
				isLayerLocked(clip.layer_id) ||
				(clip.locked && properties.locked !== false)
			)
				continue;
			await core.changeClipProperties(clip.id, {
				hidden: clip.hidden,
				alpha_locked: clip.alpha_locked,
				locked: clip.locked,
				opacity: clip.opacity,
				blend_mode: clip.blend_mode,
				...properties,
			});
		}
	};

	return {
		addClip,
		deleteClip,
		moveClip,
		changeClipDuration,
		changeClipName,
		changeClipSize,
		changeClipProperties,
		ensureClipAt,
		duplicateClip,
		duplicateLinkedClip,
		canMergeSelectedClips: getMergeSources().length >= 2,
		mergeSelectedClips,
	};
};
