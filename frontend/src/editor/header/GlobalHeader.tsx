import { IconFileExport, IconMenu2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useMediaQuery, useToggle } from "usehooks-ts";
import Button from "~/components/Button";
import IconButton from "~/components/IconButton";
import Tooltip from "~/components/Tooltip";
import { useDialogs } from "~/editor/dialogs/useDialogs";
import { useI18n } from "~/features/i18n/useI18n";
import { useProjectExport } from "~/features/io/export/useProjectExport";
import { useProject } from "~/features/project/useProject";
import GlobalMenubar from "./GlobalMenubar";

const GlobalHeader = () => {
	const isDesktop: boolean = useMediaQuery("(min-width: 720px)");
	const { t } = useI18n();
	const project = useProject();
	const dialogs = useDialogs();
	const { progress: exportProgress } = useProjectExport();

	const ExportButton = isDesktop ? Button : IconButton;

	const [isMenubarOpen, toggleMenubarOpen] = useToggle(false);

	return (
		<header className="relative z-10 border-b border-border bg-background pt-[env(safe-area-inset-top,0)] backdrop-blur-xl [-webkit-app-region:drag]">
			<div className="ml-[env(titlebar-area-x,0)] grid h-full w-[env(titlebar-area-width,100%)] grid-cols-[1fr_auto_1fr] items-center gap-1 px-2">
				{isDesktop ? (
					<div className="flex">
						<div className="[-webkit-app-region:no-drag]">
							<GlobalMenubar />
						</div>
					</div>
				) : (
					<div
						data-open={isMenubarOpen}
						className="grid grid-cols-[auto_1fr] items-center data-[open=true]:col-span-3"
					>
						<IconButton
							label={t("action.file.open")}
							icon={isMenubarOpen ? IconX : IconMenu2}
							onClick={() => toggleMenubarOpen()}
						/>
						<AnimatePresence>
							{isMenubarOpen && (
								<motion.div
									className="overflow-x-auto"
									initial={{ opacity: 0, x: -64 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -64 }}
								>
									<GlobalMenubar />
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
				{(!isMenubarOpen || isDesktop) && (
					<>
						<div className="col-start-2 flex justify-center [-webkit-app-region:no-drag]">
							{project.settings && (
								<Tooltip label={t("header.projectSettings")} side="bottom">
									<Button
										label={
											(project.title ?? "") +
											(project.hasUnsavedChanges ? " *" : "")
										}
										onClick={() => dialogs.open("editCompositionSettings")}
									/>
								</Tooltip>
							)}
						</div>
						<div className="col-start-3 flex min-w-max justify-end">
							<div className="contents [-webkit-app-region:no-drag]">
								<ExportButton
									label={
										exportProgress
											? t("header.exportProgress", exportProgress)
											: t("header.export")
									}
									icon={IconFileExport}
									variant="primary"
									disabled={project.settings == null || exportProgress != null}
									onClick={() => dialogs.open("exportProject")}
								/>
							</div>
						</div>
					</>
				)}
			</div>
		</header>
	);
};

export default GlobalHeader;
