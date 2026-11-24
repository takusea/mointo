import { useEffect, useState } from "react";
import Slider from "~/components/Slider";
import TextField from "~/components/TextField";
import ToggleGroup from "~/components/ToggleGroup/ToggleGroup";
import ToggleGroupItem from "~/components/ToggleGroup/ToggleGroupItem";
import { type HSVAColor, hsvaToRgba, rgbaToHsva } from "~/lib/color";

type Props = {
	currentColor: HSVAColor;
	onCurrentColorChange: (color: HSVAColor) => void;
};

const ColorSlider = ({ currentColor, onCurrentColorChange }: Props) => {
	const [mode, setMode] = useState<"rgb" | "hsv">("rgb");
	const rgbaColor = hsvaToRgba(currentColor);
	const hexColor = [rgbaColor.r, rgbaColor.g, rgbaColor.b]
		.map((channel) => channel.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase();
	const [hexInput, setHexInput] = useState(hexColor);

	useEffect(() => setHexInput(hexColor), [hexColor]);
	const channels =
		mode === "rgb"
			? [
					{ key: "r", label: "R", value: rgbaColor.r, max: 255 },
					{ key: "g", label: "G", value: rgbaColor.g, max: 255 },
					{ key: "b", label: "B", value: rgbaColor.b, max: 255 },
				]
			: [
					{ key: "h", label: "H", value: Math.round(currentColor.h), max: 360 },
					{
						key: "s",
						label: "S",
						value: Math.round(currentColor.s * 100),
						max: 100,
					},
					{
						key: "v",
						label: "V",
						value: Math.round(currentColor.v * 100),
						max: 100,
					},
				];

	return (
		<div className="flex flex-col gap-2">
			<ToggleGroup
				type="single"
				value={mode}
				onValueChange={(value) => {
					if (value === "rgb" || value === "hsv") setMode(value);
				}}
			>
				{(["rgb", "hsv"] as const).map((nextMode) => (
					<ToggleGroupItem
						key={nextMode}
						label={nextMode.toUpperCase()}
						value={nextMode}
					/>
				))}
			</ToggleGroup>
			{channels.map(({ key, label, value, max }) => (
				<div
					key={key}
					className="grid grid-cols-[1rem_1fr_2rem] items-center gap-1"
				>
					<span className="font-medium">{label}</span>
					<Slider
						min={0}
						max={max}
						step={1}
						value={[value]}
						onValueChange={([next]) => {
							if (next === undefined) return;
							if (mode === "rgb") {
								onCurrentColorChange(rgbaToHsva({ ...rgbaColor, [key]: next }));
							} else {
								onCurrentColorChange({
									...currentColor,
									[key]: key === "h" ? next : next / 100,
								});
							}
						}}
					/>
					<span className="text-right">{value}</span>
				</div>
			))}
			<div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
				<span className="font-medium">HEX</span>
				<TextField
					value={hexInput}
					maxLength={6}
					leftElement="#"
					spellCheck={false}
					onChange={(event) => {
						const next = event.currentTarget.value
							.replace(/[^\da-f]/gi, "")
							.slice(0, 6);
						setHexInput(next.toUpperCase());
						if (next.length !== 6) return;
						const value = Number.parseInt(next, 16);
						onCurrentColorChange(
							rgbaToHsva({
								r: (value >> 16) & 255,
								g: (value >> 8) & 255,
								b: value & 255,
								a: currentColor.a,
							}),
						);
					}}
				/>
				<div
					className="aspect-square h-full rounded-md border border-border bg-(--color)"
					style={
						{
							"--color": `rgb(${rgbaColor.r} ${rgbaColor.g} ${rgbaColor.b})`,
						} as React.CSSProperties
					}
				/>
			</div>
		</div>
	);
};

export default ColorSlider;
