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
	compositionSettings: CompositionSettings;
	onCompositionSettingsChanged: (
		compositionSettings: CompositionSettings,
	) => void;
};

const CompositionSettingsForm = ({
	compositionSettings,
	onCompositionSettingsChanged,
}: Props) => {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-2">
			<span className="font-medium">{t("project.size")}</span>
			<div className="grid grid-cols-2 gap-2">
				<NumberField
					id="width"
					aria-label={t("project.width")}
					value={compositionSettings.width}
					min={0}
					max={10000}
					leftElement={<IconArrowAutofitWidth />}
					rightElement="px"
					onValueChange={(width) =>
						onCompositionSettingsChanged({ ...compositionSettings, width })
					}
				/>
				<NumberField
					id="height"
					aria-label={t("project.height")}
					value={compositionSettings.height}
					min={0}
					max={10000}
					leftElement={<IconArrowAutofitHeight />}
					rightElement="px"
					onValueChange={(height) =>
						onCompositionSettingsChanged({ ...compositionSettings, height })
					}
				/>
			</div>
			<Separator />
			<span className="font-medium">{t("project.framePosition")}</span>
			<div className="grid grid-cols-2 gap-2">
				<NumberField
					id="startFrame"
					aria-label={t("project.startFrame")}
					value={compositionSettings.startFrame}
					min={0}
					max={compositionSettings.endFrame}
					leftElement={<IconLayoutAlignLeft />}
					rightElement="f"
					onValueChange={(startFrame) =>
						onCompositionSettingsChanged({
							...compositionSettings,
							startFrame,
						})
					}
				/>
				<NumberField
					id="endFrame"
					aria-label={t("project.endFrame")}
					value={compositionSettings.endFrame}
					min={compositionSettings.startFrame}
					max={MAX_FRAME_INDEX}
					leftElement={<IconLayoutAlignRight />}
					rightElement="f"
					onValueChange={(endFrame) =>
						onCompositionSettingsChanged({
							...compositionSettings,
							endFrame,
						})
					}
				/>
			</div>
			<span className="font-medium">{t("project.frameRate")}</span>
			<NumberField
				id="frameRate"
				aria-label={t("project.frameRate")}
				value={compositionSettings.frameRate}
				min={0}
				max={1000}
				leftElement={<IconRunSprint />}
				rightElement="fps"
				onValueChange={(frameRate) =>
					onCompositionSettingsChanged({
						...compositionSettings,
						frameRate,
					})
				}
			/>
		</div>
	);
};

export default CompositionSettingsForm;
