import { createContext } from "react";
import type { ToolProperty } from "~/core/CoreService";
import type { HSVAColor } from "~/lib/color";
import type { ToolKind } from "./type";

export type ToolContextValue = {
	tool: ToolKind;
	color: HSVAColor;
	colorHistory: HSVAColor[];
	properties: ToolProperty[];
	pressureEnabled: boolean;
	pressureCurve: [number, number][];
	stabilization: number;
	setTool: (tool: ToolKind) => void;
	setPressureEnabled: (enabled: boolean) => void;
	setPressureCurve: (curve: [number, number][]) => void;
	setStabilization: (value: number) => void;
	setColor: (color: HSVAColor) => void;
	setProperty: (key: string, value: unknown) => void;
	pushColorHistory: (color: HSVAColor) => void;
};

export const ToolContext = createContext<ToolContextValue | null>(null);
