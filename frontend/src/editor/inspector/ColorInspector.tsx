import Card from "~/components/Card";
import ColorPalette from "~/components/Color/ColorPalette";
import ColorPicker from "~/components/Color/ColorPicker";
import ColorSlider from "~/components/Color/ColorSlider";
import { useI18n } from "~/features/i18n/useI18n";
import type { HSVAColor } from "~/lib/color";

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

	return (
		<Card>
			<div className="flex flex-col gap-2">
				<h2 className="font-bold">{t("inspector.colorPicker")}</h2>
				<ColorPicker
					currentColor={currentColor}
					onCurrentColorChange={onCurrentColorChange}
				/>
				<ColorSlider
					currentColor={currentColor}
					onCurrentColorChange={onCurrentColorChange}
				/>
				<ColorPalette
					colorHistory={colorHistory}
					onCurrentColorChange={onCurrentColorChange}
				/>
			</div>
		</Card>
	);
};

export default ColorInspector;
