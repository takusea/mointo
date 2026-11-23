import { useRef } from "react";
import { useCore } from "~/core/useCore";
import type { ClipMetadata, ClipProperties, ClipType } from "~/lib/clip";
import type { LayerId, LayerState } from "~/lib/layer";

type Options = {
	clips: ClipMetadata[];
	layers: LayerState[];
	selectedClipId: string | undefined;
	selectedClipIds: string[];
	selectedLayerId: LayerId | null;
	currentFrame: number;
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
	selectedLayerId,
	currentFrame,
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

	const findAvailableLayer = (
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

	const addClipAtFrame = async (
		start: number,
		startingLayerId: LayerId,
		duration: number,
		clipType: ClipType,
		createClip: (layerId: LayerId) => Promise<ClipMetadata[]>,
		afterCreate?: (clip: ClipMetadata) => Promise<void>,
	) => {
		const destinationLayer = findAvailableLayer(
			startingLayerId,
			start,
			duration,
		);
		if (destinationLayer == null) return undefined;

		const existingIds = new Set(clips.map((clip) => clip.id));
		const nextClips = await createClip(destinationLayer.id);
		const clip = nextClips.find(
			(candidate) =>
				!existingIds.has(candidate.id) &&
				candidate.clip_type === clipType &&
				candidate.start === start &&
				candidate.layer_id === destinationLayer.id,
		);
		if (clip == null) return undefined;
		await afterCreate?.(clip);
		onClipSelected(clip.id, destinationLayer.id, true);
		return clip;
	};

	const addClip = async (start: number, layerId: LayerId) => {
		await addClipAtFrame(start, layerId, 3, "image", (targetLayerId) =>
			core.addClip(start, targetLayerId),
		);
	};

	const addImageClip = async (
		start: number,
		layerId: LayerId,
		width: number,
		height: number,
		pixels: Uint8ClampedArray,
	) => {
		await addClipAtFrame(
			start,
			layerId,
			3,
			"image",
			(targetLayerId) =>
				core.addClipWithSize(start, targetLayerId, width, height),
			(clip) => core.replaceClipPixels(clip.id, pixels),
		);
	};

	const addAudioClip = async (
		start: number,
		layerId: LayerId,
		duration: number,
		data: Uint8Array,
		mimeType: string,
		name: string,
	) => {
		await addClipAtFrame(start, layerId, duration, "audio", (targetLayerId) =>
			core.addAudioClip(start, targetLayerId, duration, data, mimeType, name),
		);
	};

	const addGroupClip = async (start: number, layerId: LayerId) => {
		await addClipAtFrame(start, layerId, 3, "group", (targetLayerId) =>
			core.addGroupClip(start, targetLayerId),
		);
	};

	const ensureClipAt = async (frame: number, layerId: LayerId | null) => {
		if (layerId == null || isLayerLocked(layerId)) return undefined;

		const existingClip = clips.find(
			(clip) =>
				clip.clip_type === "image" &&
				clip.layer_id === layerId &&
				clip.start <= frame &&
				frame < clip.start + clip.duration,
		);
		if (existingClip != null) {
			onClipSelected(existingClip.id, layerId);
			return existingClip.id;
		}

		const newClip = await addClipAtFrame(
			frame,
			layerId,
			3,
			"image",
			(targetId) => core.addClip(frame, targetId),
		);
		return newClip?.id;
	};

	const duplicateClip = async (id: string | undefined, linkAsset = false) => {
		const sources = getSelectedClips(id ?? "").filter(
			(clip) => !clip.locked && !isLayerLocked(clip.layer_id),
		);
		if (sources.length === 0 || selectedLayerId == null) return;
		const anchor = sources.find((clip) => clip.id === id) ?? sources[0];
		const anchorLayerIndex = layers.findIndex(
			(layer) => layer.id === anchor.layer_id,
		);
		const selectedLayerIndex = layers.findIndex(
			(layer) => layer.id === selectedLayerId,
		);
		if (anchorLayerIndex < 0 || selectedLayerIndex < 0) return;
		const targetLayerBySource = new Map(
			sources.map((source) => {
				const sourceLayerIndex = layers.findIndex(
					(layer) => layer.id === source.layer_id,
				);
				return [
					source.id,
					layers[selectedLayerIndex + sourceLayerIndex - anchorLayerIndex]?.id,
				] as const;
			}),
		);
		const duplicableSources = sources.filter((source) => {
			const targetLayerId = targetLayerBySource.get(source.id);
			return targetLayerId != null && !isLayerLocked(targetLayerId);
		});
		if (duplicableSources.length === 0) return;

		const sourcesToDuplicate = duplicableSources;
		const minimumStart = Math.min(
			...sourcesToDuplicate.map((clip) => clip.start),
		);
		let offset = currentFrame - minimumStart;
		if (sourcesToDuplicate.some((source) => source.start + offset < 0)) {
			offset += Math.max(
				...sourcesToDuplicate.map((source) => -source.start - offset),
			);
		}
		while (true) {
			const collisions = sourcesToDuplicate.flatMap((source) =>
				clips
					.filter(
						(candidate) =>
							candidate.layer_id === targetLayerBySource.get(source.id) &&
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
			for (const source of sourcesToDuplicate) {
				const start = source.start + offset;
				const targetLayerId = targetLayerBySource.get(source.id);
				if (targetLayerId == null) continue;
				let nextClips: ClipMetadata[];
				if (source.clip_type === "audio") {
					const audioData = await core.getAudioClipData(source.id);
					if (audioData == null) {
						throw new Error(`Audio data is missing for clip ${source.id}.`);
					}
					nextClips = await core.addAudioClip(
						start,
						targetLayerId,
						source.duration,
						audioData,
						source.audio_mime_type,
						source.name,
					);
				} else if (source.clip_type === "group") {
					nextClips = await core.addGroupClip(start, targetLayerId);
				} else {
					nextClips = await core.addClip(start, targetLayerId);
				}
				const duplicate = nextClips.find(
					(candidate) =>
						!existingIds.has(candidate.id) &&
						candidate.layer_id === targetLayerId &&
						candidate.start === start,
				);
				if (duplicate == null) continue;
				existingIds.add(duplicate.id);
				duplicateIds.push(duplicate.id);

				if (source.clip_type !== "audio") {
					await core.changeClipDuration(duplicate.id, source.duration);
				}
				await core.changeClipName(duplicate.id, source.name);
				if (source.clip_type === "image") {
					await core.changeClipSize(duplicate.id, source.width, source.height);
				}
				const properties: ClipProperties = {
					hidden: source.hidden,
					locked: source.locked,
				};
				if (source.clip_type === "image") {
					properties.alpha_locked = source.alpha_locked;
					properties.opacity = source.opacity;
					properties.blend_mode = source.blend_mode;
				} else {
					if (source.clip_type === "audio")
						properties.audio_start_frame = source.audio_start_frame;
					else properties.group_depth = source.depth;
				}
				await core.changeClipProperties(duplicate.id, properties);
				const snapshot = core.getSnapshot();
				const transform = snapshot.clipTransforms[source.id];
				if (transform != null)
					await core.updateClipTransform(duplicate.id, transform);
				for (const key of snapshot.clipKeyframes[source.id] ?? []) {
					await core.setClipKeyframe(
						duplicate.id,
						key.frame + offset,
						key.property,
						key.value,
					);
				}
				if (linkAsset && source.clip_type !== "group") {
					await core.linkClips(source.id, duplicate.id);
				} else if (source.clip_type === "image") {
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
		if (sources.some((clip) => clip.clip_type !== "image")) return [];

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

	const getSplittableClips = () => {
		const selectedIds = new Set([
			...selectedClipIds,
			...(selectedClipId == null ? [] : [selectedClipId]),
		]);
		return clips.filter(
			(clip) =>
				selectedIds.has(clip.id) &&
				!clip.locked &&
				!isLayerLocked(clip.layer_id) &&
				currentFrame > clip.start &&
				currentFrame < clip.start + clip.duration,
		);
	};

	const splitSelectedClip = async () => {
		const sources = getSplittableClips();
		if (sources.length === 0) return;
		const snapshot = core.getSnapshot();
		const splitSources = await Promise.all(
			sources.map(async (source) => ({
				source,
				leftDuration: currentFrame - source.start,
				rightDuration: source.start + source.duration - currentFrame,
				audioData:
					source.clip_type === "audio"
						? await core.getAudioClipData(source.id)
						: undefined,
				transform: snapshot.clipTransforms[source.id],
				keyframes: snapshot.clipKeyframes[source.id] ?? [],
			})),
		);
		const existingIds = new Set(clips.map((clip) => clip.id));
		const splitClipIds: string[] = [];
		let changed = false;

		await core.beginActionGroup();
		try {
			for (const {
				source,
				leftDuration,
				rightDuration,
				audioData,
				transform,
				keyframes,
			} of splitSources) {
				let nextClips: ClipMetadata[];
				if (source.clip_type === "audio") {
					if (audioData == null) {
						throw new Error(`Audio data is missing for clip ${source.id}.`);
					}
					nextClips = await core.addAudioClip(
						currentFrame,
						source.layer_id,
						rightDuration,
						audioData,
						source.audio_mime_type,
						source.name,
					);
				} else if (source.clip_type === "group") {
					nextClips = await core.addGroupClip(currentFrame, source.layer_id);
				} else {
					nextClips = await core.addClipWithSize(
						currentFrame,
						source.layer_id,
						source.width,
						source.height,
					);
				}
				changed = true;
				const splitClip = nextClips.find(
					(clip) =>
						!existingIds.has(clip.id) &&
						clip.clip_type === source.clip_type &&
						clip.start === currentFrame &&
						clip.layer_id === source.layer_id,
				);
				if (splitClip == null) {
					throw new Error(`Could not create a split for clip ${source.id}.`);
				}
				existingIds.add(splitClip.id);

				if (source.clip_type !== "group") {
					await core.linkClips(source.id, splitClip.id);
				}
				if (source.clip_type !== "audio") {
					await core.changeClipDuration(splitClip.id, rightDuration);
				}
				await core.changeClipName(splitClip.id, source.name);
				const properties: ClipProperties =
					source.clip_type === "image"
						? {
								hidden: source.hidden,
								locked: source.locked,
								alpha_locked: source.alpha_locked,
								opacity: source.opacity,
								blend_mode: source.blend_mode,
							}
						: source.clip_type === "audio"
							? {
									hidden: source.hidden,
									locked: source.locked,
									audio_start_frame: source.audio_start_frame + leftDuration,
								}
							: {
									hidden: source.hidden,
									locked: source.locked,
									group_depth: source.depth,
								};
				await core.changeClipProperties(splitClip.id, properties);
				if (transform != null)
					await core.updateClipTransform(splitClip.id, transform);
				for (const keyframe of keyframes) {
					await core.setClipKeyframe(
						splitClip.id,
						keyframe.frame,
						keyframe.property,
						keyframe.value,
					);
				}
				await core.changeClipDuration(source.id, leftDuration);
				splitClipIds.push(splitClip.id);
			}
		} catch (error) {
			await core.endActionGroup();
			if (changed) await core.undo();
			throw error;
		}
		await core.endActionGroup();
		onClipsSelected(splitClipIds);
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
			if (
				clip.clip_type !== "image" ||
				clip.locked ||
				isLayerLocked(clip.layer_id)
			)
				continue;
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
			const currentProperties: ClipProperties =
				clip.clip_type === "image"
					? {
							hidden: clip.hidden,
							alpha_locked: clip.alpha_locked,
							locked: clip.locked,
							opacity: clip.opacity,
							blend_mode: clip.blend_mode,
						}
					: clip.clip_type === "group"
						? {
								hidden: clip.hidden,
								locked: clip.locked,
								group_depth: clip.depth,
							}
						: { hidden: clip.hidden, locked: clip.locked };
			await core.changeClipProperties(clip.id, {
				...currentProperties,
				...properties,
				hidden: properties.hidden ?? currentProperties.hidden,
				locked: properties.locked ?? currentProperties.locked,
			});
		}
	};

	return {
		addClip,
		addImageClip,
		addAudioClip,
		addGroupClip,
		deleteClip,
		splitSelectedClip,
		canSplitSelectedClip: getSplittableClips().length > 0,
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
