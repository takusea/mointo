import { useCore } from "~/core/useCore";
import type { ClipMetadata, ClipProperties } from "~/lib/clip";
import type { LayerId } from "~/lib/layer";

type Options = {
	clips: ClipMetadata[];
	isLayerLocked: (layerId: LayerId) => boolean;
	onClipSelected: (
		id: string,
		layerId: LayerId,
		shouldSelectLayer?: boolean,
	) => void;
};

export const useClipCommands = ({
	clips,
	isLayerLocked,
	onClipSelected,
}: Options) => {
	const core = useCore();

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

	const duplicateClip = async (id: string | undefined) => {
		const clip = clips.find((candidate) => candidate.id === id);
		if (clip == null || clip.locked || isLayerLocked(clip.layer_id)) return;

		const otherClips = clips.filter(
			(candidate) =>
				candidate.id !== clip.id && candidate.layer_id === clip.layer_id,
		);
		let start = clip.start + clip.duration;
		while (
			otherClips.some(
				(candidate) =>
					start < candidate.start + candidate.duration &&
					candidate.start < start + clip.duration,
				)
		) {
			start = Math.max(
				start + 1,
				...otherClips
					.filter((candidate) => candidate.start < start + clip.duration)
					.map((candidate) => candidate.start + candidate.duration),
			);
		}

		const existingIds = new Set(clips.map((candidate) => candidate.id));
		await core.beginActionGroup();
		try {
			const nextClips = await core.addClip(start, clip.layer_id);
			const duplicate = nextClips.find(
				(candidate) =>
					!existingIds.has(candidate.id) &&
					candidate.layer_id === clip.layer_id &&
					candidate.start === start,
			);
			if (duplicate == null) return;

			await core.changeClipDuration(duplicate.id, clip.duration);
			await core.changeClipName(duplicate.id, clip.name);
			await core.changeClipSize(duplicate.id, clip.width, clip.height);
			await core.changeClipProperties(duplicate.id, {
				hidden: clip.hidden,
				alpha_locked: clip.alpha_locked,
				locked: clip.locked,
				opacity: clip.opacity,
				blend_mode: clip.blend_mode,
			});
			const pixels = await core.getClipPixels(clip.id);
			if (pixels != null) await core.replaceClipPixels(duplicate.id, pixels);
			onClipSelected(duplicate.id, duplicate.layer_id, true);
		} finally {
			await core.endActionGroup();
		}
	};

	const deleteClip = async (id: string) => {
		const clip = clips.find((candidate) => candidate.id === id);
		if (clip == null || isLayerLocked(clip.layer_id)) return;
		await core.deleteClip(id);
	};

	const moveClip = async (id: string, start: number, layerId: LayerId) => {
		const clip = clips.find((candidate) => candidate.id === id);
		if (
			clip == null ||
			isLayerLocked(clip.layer_id) ||
			isLayerLocked(layerId)
		) {
			return;
		}

		const otherLayerClips = clips.filter(
			(candidate) => candidate.id !== id && candidate.layer_id === layerId,
		);
		const candidateStarts = [
			start,
			0,
			...otherLayerClips.flatMap((candidate) => [
				candidate.start - clip.duration,
				candidate.start + candidate.duration,
			]),
		].filter(
			(candidateStart) =>
				candidateStart >= 0 &&
				!otherLayerClips.some(
					(candidate) =>
						candidateStart < candidate.start + candidate.duration &&
						candidate.start < candidateStart + clip.duration,
				),
		);
		const direction = Math.sign(start - clip.start);
		const adjustedStart = candidateStarts.reduce((closest, candidateStart) => {
			const distanceDifference =
				Math.abs(candidateStart - start) - Math.abs(closest - start);
			if (distanceDifference !== 0)
				return distanceDifference < 0 ? candidateStart : closest;
			return direction * (candidateStart - closest) > 0
				? candidateStart
				: closest;
		});

		await core.moveClip(id, adjustedStart, layerId);
	};

	const changeClipDuration = async (id: string, duration: number) => {
		const clip = clips.find((candidate) => candidate.id === id);
		if (clip == null || isLayerLocked(clip.layer_id)) return;

		const nextClipStart = clips.reduce(
			(earliest, candidate) =>
				candidate.id !== id &&
				candidate.layer_id === clip.layer_id &&
				candidate.start >= clip.start
					? Math.min(earliest, candidate.start)
					: earliest,
			Number.POSITIVE_INFINITY,
		);
		const adjustedDuration = Math.max(
			1,
			Math.min(duration, nextClipStart - clip.start),
		);

		await core.changeClipDuration(id, adjustedDuration);
	};

	const changeClipName = async (id: string, name: string) => {
		if (!clips.some((clip) => clip.id === id) || name.trim().length === 0) {
			return;
		}
		await core.changeClipName(id, name.trim());
	};

	const changeClipSize = async (id: string, width: number, height: number) => {
		const clip = clips.find((candidate) => candidate.id === id);
		if (clip == null || isLayerLocked(clip.layer_id)) return;
		await core.changeClipSize(
			id,
			Math.max(1, Math.floor(width)),
			Math.max(1, Math.floor(height)),
		);
	};

	const changeClipProperties = async (
		id: string,
		properties: ClipProperties,
	) => {
		const clip = clips.find((candidate) => candidate.id === id);
		if (clip == null || isLayerLocked(clip.layer_id)) return;
		await core.changeClipProperties(id, properties);
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
	};
};
