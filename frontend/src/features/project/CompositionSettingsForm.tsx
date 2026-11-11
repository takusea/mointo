import {
	IconArrowAutofitHeight,
	IconArrowAutofitWidth,
	IconLayoutAlignLeft,
	IconLayoutAlignRight,
	IconRunSprint,
} from "@tabler/icons-react";
import NumberField from "~/components/NumberField";
import Separator from "~/components/Separator";
import { useI18n } from "~/features/i18n/useI18n";
import { type CompositionSettings, MAX_FRAME_INDEX } from "./type";

type Props = {
	settings: CompositionSettings;
	onSettingsChanged: (settings: CompositionSettings) => void;
};

const CompositionSettingsForm = ({ settings, onSettingsChanged }: Props) => {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-2">
			<span className="font-medium">{t("dialog.project.size")}</span>
			<div className="grid grid-cols-2 gap-2">
				<NumberField
					id="width"
					aria-label={t("dialog.project.width")}
					value={settings.width}
					min={0}
					max={10000}
					leftElement={<IconArrowAutofitWidth />}
					rightElement="px"
					onValueChange={(width) => onSettingsChanged({ ...settings, width })}
				/>
				<NumberField
					id="height"
					aria-label={t("dialog.project.height")}
					value={settings.height}
					min={0}
					max={10000}
					leftElement={<IconArrowAutofitHeight />}
					rightElement="px"
					onValueChange={(height) => onSettingsChanged({ ...settings, height })}
				/>
			</div>
			<Separator />
			<span className="font-medium">{t("dialog.project.framePosition")}</span>
			<div className="grid grid-cols-2 gap-2">
				<NumberField
					id="startFrame"
					aria-label={t("dialog.project.startFrame")}
					value={settings.startFrame}
					min={0}
					max={settings.endFrame}
					leftElement={<IconLayoutAlignLeft />}
					rightElement="f"
					onValueChange={(startFrame) =>
						onSettingsChanged({
							...settings,
							startFrame,
						})
					}
				/>
				<NumberField
					id="endFrame"
					aria-label={t("dialog.project.endFrame")}
					value={settings.endFrame}
					min={settings.startFrame}
					max={MAX_FRAME_INDEX}
					leftElement={<IconLayoutAlignRight />}
					rightElement="f"
					onValueChange={(endFrame) =>
						onSettingsChanged({
							...settings,
							endFrame,
						})
					}
				/>
			</div>
			<span className="font-medium">{t("dialog.project.frameRate")}</span>
			<NumberField
				id="frameRate"
				aria-label={t("dialog.project.frameRate")}
				value={settings.frameRate}
				min={0}
				max={1000}
				leftElement={<IconRunSprint />}
				rightElement="fps"
				onValueChange={(frameRate) =>
					onSettingsChanged({
						...settings,
						frameRate,
					})
				}
			/>
		</div>
	);
};

export default CompositionSettingsForm;
