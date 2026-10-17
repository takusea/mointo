import Card from "~/components/Card";
import ColorPalette from "~/components/ColorPalette";
import ColorPicker from "~/components/ColorPicker";
import { useI18n } from "~/features/i18n/useI18n";
import { type HSVAColor, hsvaToRgba } from "~/lib/color";

type Props = {
	currentColor: HSVAColor;
	colorHistory: HSVAColor[];
	onCurrentColorChange: (color: HSVAColor) => void;
};

const ColorInspector = ({
	currentColor,
	colorHistory,
	onCurrentColorChange,
}: Props) => {
	const { t } = useI18n();
	const rgbaColor = hsvaToRgba(currentColor);
	const hsvaColor = {
		h: Math.round(currentColor.h),
		s: Math.round(currentColor.s * 100),
		v: Math.round(currentColor.v * 100),
		a: 255,
	};

	return (
		<Card>
			<div className="flex flex-col gap-2">
				<h2 className="font-bold">{t("inspector.colorPicker")}</h2>
				<ColorPicker
					currentColor={currentColor}
					onCurrentColorChange={onCurrentColorChange}
				/>
				<div className="flex gap-2">
					<div
						className="relative w-8 h-8 rounded border border-zinc-500/40 bg-[url(/transparent.png)] before:content-[''] before:rounded-sm before:absolute before:inset-1 before:bg-(--color) before:z-10"
						style={
							{
						"--color": `rgb(${rgbaColor.r} ${rgbaColor.g} ${rgbaColor.b})`,
							} as React.CSSProperties
						}
					/>
					<div className="flex flex-col gap-1 font-mono">
						<span>
							h{hsvaColor.h} / s{hsvaColor.s} / v{hsvaColor.v}
						</span>
						<span>
							r{rgbaColor.r} / g{rgbaColor.g} / b{rgbaColor.b}
						</span>
					</div>
				</div>
				<ColorPalette
					currentColor={currentColor}
					colorHistory={colorHistory}
					onCurrentColorChange={onCurrentColorChange}
				/>
			</div>
		</Card>
	);
};

export default ColorInspector;
