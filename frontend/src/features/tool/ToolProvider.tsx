import { type JSX, useEffect, useState } from "react";
import type { ToolProperty } from "~/core/CoreService";
import { useCore } from "~/core/useCore";
import { type HSVAColor, hasSameRgbColor } from "~/lib/color";
import { ToolContext } from "./ToolContext";
import type { ToolKind } from "./type";

type Props = {
	children: JSX.Element;
};

export const ToolProvider = ({ children }: Props) => {
	const core = useCore();

	const [tool, setTool] = useState<ToolKind>("pen");
	const [properties, setProperties] = useState<ToolProperty[]>([]);
	const [pressureEnabled, setPressureEnabled] = useState(
		() => localStorage.getItem("flippen.pressureEnabled") !== "false",
	);
	const [stabilization, setStabilization] = useState(() => {
		const value = Number(localStorage.getItem("flippen.stabilization"));
		return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
	});
	const [pressureCurve, setPressureCurve] = useState<[number, number][]>(() => {
		try {
			const value: unknown = JSON.parse(
				localStorage.getItem("flippen.pressureCurve") ?? "null",
			);
			if (
				Array.isArray(value) &&
				value.length >= 2 &&
				value[0]?.[0] === 0 &&
				value.at(-1)?.[0] === 1 &&
				value.every(
					(point) =>
						Array.isArray(point) &&
						point.length === 2 &&
						point.every((n) => typeof n === "number" && n >= 0 && n <= 1),
				) &&
				value.every(
					(point, index) => index === 0 || value[index - 1][0] < point[0],
				)
			) {
				return value as [number, number][];
			}
		} catch {
			return [
				[0, 0],
				[1, 1],
			];
		}
		return [
			[0, 0],
			[1, 1],
		];
	});
	const [color, setColor] = useState<HSVAColor>({
		h: 0,
		s: 0,
		v: 0,
		a: 255,
	});
	const [colorHistory, setColorHistory] = useState<HSVAColor[]>([color]);

	const COLOR_HISTORY_LIMIT = 100;
	const setProperty = async (key: string, value: unknown) => {
		await core.setToolProperty(tool, key, value);
		setProperties((await core.getToolProperties(tool)) ?? []);
	};

	const pushColorHistory = (color: HSVAColor) => {
		setColorHistory((prev) => [
			color,
			...prev
				.filter((item) => !hasSameRgbColor(item, color))
				.slice(0, COLOR_HISTORY_LIMIT - 1),
		]);
	};

	useEffect(() => {
		localStorage.setItem("flippen.pressureEnabled", String(pressureEnabled));
	}, [pressureEnabled]);
	useEffect(() => {
		localStorage.setItem("flippen.stabilization", String(stabilization));
	}, [stabilization]);
	useEffect(() => {
		localStorage.setItem(
			"flippen.pressureCurve",
			JSON.stringify(pressureCurve),
		);
	}, [pressureCurve]);

	useEffect(() => {
		let active = true;
		void core.getToolProperties(tool).then((nextProperties) => {
			if (active) setProperties(nextProperties ?? []);
		});
		return () => {
			active = false;
		};
	}, [core.getToolProperties, tool]);

	return (
		<ToolContext
			value={{
				tool,
				color,
				setTool,
				setColor,
				colorHistory,
				pushColorHistory,
				properties,
				pressureEnabled,
				pressureCurve,
				stabilization,
				setProperty,
				setPressureEnabled,
				setPressureCurve,
				setStabilization,
			}}
		>
			{children}
		</ToolContext>
	);
};
