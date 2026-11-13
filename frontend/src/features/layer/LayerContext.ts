import { createContext } from "react";
import type { LayerId, LayerState } from "~/lib/layer";

export type LayerContextValue = {
	layers: LayerState[];
	isLayerHidden: (layerId: LayerId) => boolean;
	isLayerLocked: (layerId: LayerId) => boolean;
	selectedLayerId: LayerId | null;
	selectLayer: (layerId: LayerId) => void;
	showLayer: (layerId: LayerId) => void;
	hideLayer: (layerId: LayerId) => void;
	toggleLayerLock: (layerId: LayerId) => void;
	swapLayers: (sourceId: LayerId, targetId: LayerId) => void;
};

export const LayerContext = createContext<LayerContextValue | null>(null);
