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

	const selectionState = useClipSelection({
		clips,
		currentClip,
		currentLayerId: layerContext.selectedLayerId,
		currentFrame: playbackContext.currentFrame,
		selectLayer: layerContext.selectLayer,
		projectSettings: projectContext.settings,
	});
	const commands = useClipCommands({
		clips,
		isLayerLocked: layerContext.isLayerLocked,
		onClipSelected: selectionState.markClipSelected,
	});
	const clipboard = useClipboard({
		currentClip,
		selection: selectionState.selection,
		selectedLayerId: layerContext.selectedLayerId,
		layers: layerContext.layers,
		currentFrame: playbackContext.currentFrame,
		projectSettings: projectContext.settings,
		isLayerLocked: layerContext.isLayerLocked,
		onClipSelected: selectionState.markClipSelected,
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
				transform: clipTransform.transform,
				selection: selectionState.selection,
				selectClip: selectionState.selectClip,
				setSelection: selectionState.setSelection,
				...clipboard,
				selectAll: selectionState.selectAll,
				...commands,
				changeTransform: clipTransform.changeTransform,
			}}
		>
			{children}
		</ClipContext>
	);
};
