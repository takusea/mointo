import type { JSX } from "react";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { ClipContext } from "./ClipContext";
import { useClipboard } from "./useClipboard";
import { useClipCommands } from "./useClipCommands";
import { useClipSelection } from "./useClipSelection";
import { useClipTransform } from "./useClipTransform";

type Props = {
	children: JSX.Element;
};

export const ClipProvider = ({ children }: Props) => {
	const layerContext = useLayer();
	const playbackContext = usePlayback();
	const projectContext = useProject();
	const { clips, clipTransforms } = useCoreSnapshot();

	const currentClip =
		layerContext.selectedLayerId == null
			? undefined
			: clips.find(
					(clip) =>
						clip.layer_id === layerContext.selectedLayerId &&
						clip.start <= playbackContext.currentFrame &&
						playbackContext.currentFrame < clip.start + clip.duration,
				);
	const currentImageClip =
		layerContext.selectedLayerId == null
			? undefined
			: clips.find(
					(clip) =>
						clip.clip_type === "image" &&
						clip.layer_id === layerContext.selectedLayerId &&
						clip.start <= playbackContext.currentFrame &&
						playbackContext.currentFrame < clip.start + clip.duration,
				);

	const selectionState = useClipSelection({
		clips,
		currentClip,
		currentLayerId: layerContext.selectedLayerId,
		currentFrame: playbackContext.currentFrame,
		selectLayer: layerContext.selectLayer,
		compositionSettings: projectContext.settings,
	});
	const commands = useClipCommands({
		clips,
		layers: layerContext.layers,
		selectedClipId: selectionState.selectedClipId,
		selectedClipIds: selectionState.selectedClipIds,
		isLayerLocked: layerContext.isLayerLocked,
		onClipSelected: selectionState.markClipSelected,
		onClipsSelected: selectionState.selectClips,
	});
	const clipboard = useClipboard({
		currentClip: currentImageClip,
		selection: selectionState.selection,
		selectedLayerId: layerContext.selectedLayerId,
		currentFrame: playbackContext.currentFrame,
		compositionSettings: projectContext.settings,
		isLayerLocked: layerContext.isLayerLocked,
		addImageClip: commands.addImageClip,
	});
	const clipTransform = useClipTransform({
		clips,
		clipTransforms,
		selectedClipId: selectionState.selectedClipId,
		isLayerLocked: layerContext.isLayerLocked,
	});

	return (
		<ClipContext
			value={{
				clips,
				selectedClipId: selectionState.selectedClipId,
				selectedClipIds: selectionState.selectedClipIds,
				transform: clipTransform.transform,
				selection: selectionState.selection,
				selectClip: selectionState.selectClip,
				selectClips: selectionState.selectClips,
				setSelection: selectionState.setSelection,
				reselect: selectionState.reselect,
				canReselect: selectionState.canReselect,
				invertSelection: selectionState.invertSelection,
				modifySelection: selectionState.modifySelection,
				...clipboard,
				selectAll: selectionState.selectAll,
				duplicateSelectedClip: () =>
					commands.duplicateClip(selectionState.selectedClipId),
				linkDuplicateSelectedClip: () =>
					commands.duplicateLinkedClip(selectionState.selectedClipId),
				...commands,
				changeTransform: clipTransform.changeTransform,
			}}
		>
			{children}
		</ClipContext>
	);
};
