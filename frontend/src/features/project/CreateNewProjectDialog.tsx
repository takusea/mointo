import { useState } from "react";
import Dialog from "~/components/Dialog";
import Separator from "~/components/Separator";
import TextField from "~/components/TextField";
import { useI18n } from "~/features/i18n/useI18n";
import CompositionSettingsForm from "./CompositionSettingsForm";
import {
	DEFAULT_END_FRAME,
	DEFAULT_FRAME_RATE,
	DEFAULT_HEIGHT,
	DEFAULT_START_FRAME,
	DEFAULT_WIDTH,
} from "./type";
import { useProject } from "./useProject";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const CreateNewProjectDialog = (props: Props) => {
	const { t } = useI18n();
	const project = useProject();

	const [title, setTitle] = useState(t("nav.untitled"));
	const [compositionSettings, setCompositionSettings] = useState({
		width: DEFAULT_WIDTH,
		height: DEFAULT_HEIGHT,
		frameRate: DEFAULT_FRAME_RATE,
		startFrame: DEFAULT_START_FRAME,
		endFrame: DEFAULT_END_FRAME,
	});

	return (
		<Dialog
			{...props}
			title={t("project.create")}
			cancelText={t("common.cancel")}
			submitText={t("project.createAction")}
			onSubmit={() => project.create(title, compositionSettings)}
		>
			<div className="mb-2 flex flex-col gap-2">
				<span className="font-medium">{t("project.name")}</span>
				<TextField id="project-title" value={title} onValueChange={setTitle} />
				<Separator />
			</div>
			<CompositionSettingsForm
				compositionSettings={compositionSettings}
				onCompositionSettingsChanged={setCompositionSettings}
			/>
		</Dialog>
	);
};

export default CreateNewProjectDialog;
