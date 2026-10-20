import { IconFilePlus, IconFolderOpen } from "@tabler/icons-react";
import { useState } from "react";
import Button from "~/components/Button";
import Splitter from "~/components/Splitter";
import { useDialogs } from "~/editor/dialogs/useDialogs";
import GlobalHeader from "~/editor/header/GlobalHeader";
import Timeline from "~/editor/timeline/Timeline";
import { useI18n } from "~/features/i18n/useI18n";
import { useProject } from "~/features/project/useProject";
import DrawCanvas from "./canvas/Canvas";
import InspectorLayout from "./InspectorLayout";

const SPLITTER_HEIGHT = 8;
const MIN_CANVAS_HEIGHT = 160;
const MIN_TIMELINE_HEIGHT = 96;
const Editor = () => {
	const { t } = useI18n();
	const project = useProject();
	const dialogs = useDialogs();

	const [timelineHeight, setTimelineHeight] = useState<number>(160);
	const maxTimelineHeight = Math.max(
		MIN_TIMELINE_HEIGHT,
		document.documentElement.clientHeight - MIN_CANVAS_HEIGHT - SPLITTER_HEIGHT,
	);

	return (
		<div className="grid h-svh w-svw grid-rows-[48px_minmax(0,1fr)] overflow-hidden">
			<GlobalHeader />
			<main
				className="relative grid min-h-0 min-w-0 p-2"
				style={{
					gridTemplateRows: `minmax(0, 1fr) ${SPLITTER_HEIGHT}px ${timelineHeight}px`,
				}}
			>
				<div className="relative">
					{project.settings ? (
						<DrawCanvas />
					) : (
						<div className="absolute grid size-full place-content-center gap-2">
							<Button
								label={t("app.newProject")}
								icon={IconFilePlus}
								variant="primary"
								size="large"
								onClick={() => {
									if (project.confirmDiscard()) dialogs.open("createProject");
								}}
							/>
							<Button
								label={t("app.openProject")}
								icon={IconFolderOpen}
								size="large"
								onClick={() => project.open()}
							/>
						</div>
					)}
					<InspectorLayout />
				</div>
				<Splitter
					orientation="horizontal"
					label={t("app.resizeTimeline")}
					value={timelineHeight}
					min={MIN_TIMELINE_HEIGHT}
					max={maxTimelineHeight}
					onResize={(delta) => {
						setTimelineHeight((height) =>
							Math.min(
								maxTimelineHeight,
								Math.max(MIN_TIMELINE_HEIGHT, height - delta),
							),
						);
					}}
				/>
				<Timeline />
			</main>
		</div>
	);
};

export default Editor;
