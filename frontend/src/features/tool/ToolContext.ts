import { createContext } from "react";
import type { ToolProperty } from "~/core/CoreService";
import type { HSVAColor } from "~/lib/color";
import type { ToolKind } from "./type";

export type LayerReferenceTool = "fill" | "eyedropper" | "wand";

export type ToolContextValue = {
	tool: ToolKind;
	color: HSVAColor;
	colorHistory: HSVAColor[];
	properties: ToolProperty[];
	pressureEnabled: boolean;
	pressureCurve: [number, number][];
	stabilization: number;
	referenceOtherLayers: Record<LayerReferenceTool, boolean>;
	setTool: (tool: ToolKind) => void;
	setPressureEnabled: (enabled: boolean) => void;
	setPressureCurve: (curve: [number, number][]) => void;
	setStabilization: (value: number) => void;
	setReferenceOtherLayers: (tool: LayerReferenceTool, enabled: boolean) => void;
	setColor: (color: HSVAColor) => void;
	setProperty: (key: string, value: unknown) => void;
	pushColorHistory: (color: HSVAColor) => void;
};

export const ToolContext = createContext<ToolContextValue | null>(null);
