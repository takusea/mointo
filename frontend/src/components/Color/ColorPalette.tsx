import { type HSVAColor, hsvaToRgba } from "~/lib/color";

type Props = {
	colorHistory: HSVAColor[];
	onCurrentColorChange: (color: HSVAColor) => void;
};

const ColorPalette = ({ colorHistory, onCurrentColorChange }: Props) => {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(16px,1fr))] gap-1">
			{Array.from(colorHistory, (color) => {
				const rgbaColor = hsvaToRgba(color);
				return (
					<button
						type="button"
						key={`${color.h}${color.s}${color.v}${color.a}`}
						className="aspect-square cursor-pointer rounded border border-zinc-500/40 bg-(--color)"
						style={
							{
								"--color": `rgb(${rgbaColor.r} ${rgbaColor.g} ${rgbaColor.b})`,
							} as React.CSSProperties
						}
						onClick={() => onCurrentColorChange(color)}
					/>
				);
			})}
		</div>
	);
};

export default ColorPalette;
