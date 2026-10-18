import {
	IconArrowAutofitHeight,
	IconArrowAutofitWidth,
	IconLayoutAlignLeft,
	IconLayoutAlignRight,
	IconRunSprint,
} from "@tabler/icons-react";
import NumberField from "~/components/NumberField";
import Separator from "~/components/Separator";
import TextField from "~/components/TextField";
import { useI18n } from "~/features/i18n/useI18n";
import { MAX_FRAME_INDEX, type ProjectSettings } from "./type";

type Props = {
	projectSettings: ProjectSettings;
	onProjectSettingsChanged: (projectSettings: ProjectSettings) => void;
};

const ProjectSettingsForm = ({
	projectSettings,
	onProjectSettingsChanged,
}: Props) => {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-2">
			<span className="font-medium">{t("project.name")}</span>
			<TextField
				id="title"
				value={projectSettings.title}
				onValueChange={(title) =>
					onProjectSettingsChanged({
						...projectSettings,
						title,
					})
				}
			/>
			<Separator />
			<span className="font-medium">{t("project.size")}</span>
			<div className="grid grid-cols-2 gap-2">
				<NumberField
					id="width"
					aria-label={t("project.width")}
					value={projectSettings.width}
					min={0}
					max={10000}
					leftElement={<IconArrowAutofitWidth />}
					rightElement="px"
					onValueChange={(width) =>
						onProjectSettingsChanged({ ...projectSettings, width })
					}
				/>
				<NumberField
					id="height"
					aria-label={t("project.height")}
					value={projectSettings.height}
					min={0}
					max={10000}
					leftElement={<IconArrowAutofitHeight />}
					rightElement="px"
					onValueChange={(height) =>
						onProjectSettingsChanged({ ...projectSettings, height })
					}
				/>
			</div>
			<Separator />
			<span className="font-medium">{t("project.framePosition")}</span>
			<div className="grid grid-cols-2 gap-2">
				<NumberField
					id="startFrame"
					aria-label={t("project.startFrame")}
					value={projectSettings.startFrame}
					min={0}
					max={projectSettings.endFrame}
					leftElement={<IconLayoutAlignLeft />}
					rightElement="f"
					onValueChange={(startFrame) =>
						onProjectSettingsChanged({
							...projectSettings,
							startFrame,
						})
					}
				/>
				<NumberField
					id="endFrame"
					aria-label={t("project.endFrame")}
					value={projectSettings.endFrame}
					min={projectSettings.startFrame}
					max={MAX_FRAME_INDEX}
					leftElement={<IconLayoutAlignRight />}
					rightElement="f"
					onValueChange={(endFrame) =>
						onProjectSettingsChanged({
							...projectSettings,
							endFrame,
						})
					}
				/>
			</div>
			<span className="font-medium">{t("project.frameRate")}</span>
			<NumberField
				id="frameRate"
				aria-label={t("project.frameRate")}
				value={projectSettings.frameRate}
				min={0}
				max={1000}
				leftElement={<IconRunSprint />}
				rightElement="fps"
				onValueChange={(frameRate) =>
					onProjectSettingsChanged({
						...projectSettings,
						frameRate,
					})
				}
			/>
		</div>
	);
};

export default ProjectSettingsForm;
