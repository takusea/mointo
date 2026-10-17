import { useState } from "react";
import Slider from "~/components/Slider";
import { useI18n } from "~/features/i18n/useI18n";
import { type HSVAColor, hsvaToRgba, rgbaToHsva } from "~/lib/color";
import ToggleGroup from "../ToggleGroup/ToggleGroup";
import ToggleGroupItem from "../ToggleGroup/ToggleGroupItem";

type Props = {
	currentColor: HSVAColor;
	onCurrentColorChange: (color: HSVAColor) => void;
};

const ColorSlider = ({ currentColor, onCurrentColorChange }: Props) => {
	const [mode, setMode] = useState<"rgb" | "hsv">("rgb");
	const { t } = useI18n();
	const rgbaColor = hsvaToRgba(currentColor);
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
		<div className="flex flex-col gap-1">
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
					<span>{label}</span>
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
		</div>
	);
};

export default ColorSlider;
