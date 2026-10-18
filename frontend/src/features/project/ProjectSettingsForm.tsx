import NumberField from "~/components/NumberField";
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
			<span className="font-medium">{t("project.width")}</span>
			<NumberField
				id="width"
				value={projectSettings.width}
				min={0}
				max={10000}
				rightElement={"px"}
				onValueChange={(width) =>
					onProjectSettingsChanged({ ...projectSettings, width })
				}
			/>
			<span className="font-medium">{t("project.height")}</span>
			<NumberField
				id="height"
				value={projectSettings.height}
				min={0}
				max={10000}
				rightElement={"px"}
				onValueChange={(height) =>
					onProjectSettingsChanged({ ...projectSettings, height })
				}
			/>
			<span className="font-medium">{t("project.frameRate")}</span>
			<NumberField
				id="frameRate"
				value={projectSettings.frameRate}
				min={0}
				max={1000}
				rightElement={"fps"}
				onValueChange={(frameRate) =>
					onProjectSettingsChanged({
						...projectSettings,
						frameRate,
					})
				}
			/>
			<span className="font-medium">{t("project.startFrame")}</span>
			<NumberField
				id="startFrame"
				value={projectSettings.startFrame}
				min={0}
				max={projectSettings.endFrame}
				rightElement={"frame"}
				onValueChange={(startFrame) =>
					onProjectSettingsChanged({
						...projectSettings,
						startFrame,
					})
				}
			/>
			<span className="font-medium">{t("project.endFrame")}</span>
			<NumberField
				id="endFrame"
				value={projectSettings.endFrame}
				min={projectSettings.startFrame}
				max={MAX_FRAME_INDEX}
				rightElement={"frame"}
				onValueChange={(endFrame) =>
					onProjectSettingsChanged({
						...projectSettings,
						endFrame,
					})
				}
			/>
		</div>
	);
};

export default ProjectSettingsForm;
