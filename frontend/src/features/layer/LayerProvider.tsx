import { type JSX, useEffect, useState } from "react";
import { useCore } from "~/core/useCore";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
import type { LayerId } from "~/lib/layer";
import { LayerContext } from "./LayerContext";

type Props = {
	children: JSX.Element;
};

export const LayerProvider = ({ children }: Props) => {
	const core = useCore();
	const { layers } = useCoreSnapshot();

	const [selectedLayerId, setSelectedLayerId] = useState<LayerId | null>(null);

	useEffect(() => {
		if (
			selectedLayerId != null &&
			layers.some((layer) => layer.id === selectedLayerId)
		) {
			return;
		}
		setSelectedLayerId(layers[1]?.id ?? layers[0]?.id ?? null);
	}, [layers, selectedLayerId]);

	const showLayer = async (layerId: LayerId) => {
		await core.showLayer(layerId);
	};

	const selectLayer = (layerId: LayerId) => {
		setSelectedLayerId(layerId);
	};

	const hideLayer = async (layerId: LayerId) => {
		await core.hideLayer(layerId);
	};

	const toggleLayerLock = async (layerId: LayerId) => {
		if (layers.find((layer) => layer.id === layerId)?.locked) {
			await core.unlockLayer(layerId);
			return;
		}
		await core.lockLayer(layerId);
	};

	return (
		<LayerContext
			value={{
				layers,
				isLayerHidden: (layerId) =>
					layers.find((layer) => layer.id === layerId)?.visible === false,
				isLayerLocked: (layerId) =>
					layers.find((layer) => layer.id === layerId)?.locked ?? false,
				selectedLayerId,
				selectLayer,
				showLayer,
				hideLayer,
				toggleLayerLock,
			}}
		>
			{children}
		</LayerContext>
	);
};
