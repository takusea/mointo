import { IconFileExport, IconMenu2, IconX } from "@tabler/icons-react";
import { type RefObject, useRef } from "react";
import { useMediaQuery, useOnClickOutside, useToggle } from "usehooks-ts";
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
	const menubarRef = useRef<HTMLDivElement>(null);
	useOnClickOutside(menubarRef as RefObject<HTMLDivElement>, (event) => {
		if (
			(event.target instanceof HTMLElement &&
				event.target.closest("[data-radix-menu-content]")) ||
			isDesktop
		) {
			return;
		}
		toggleMenubarOpen();
	});

	return (
		<header className="relative z-10 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1 border-border border-b bg-background px-2 backdrop-blur-xl">
			{!isDesktop && (
				<div
					className={`grid grid-cols-[auto_1fr] ${isMenubarOpen ? "col-span-3" : ""}`}
				>
					<IconButton
						label={t("menubar.open")}
						icon={isMenubarOpen ? IconX : IconMenu2}
						onClick={() => toggleMenubarOpen()}
					/>
					{isMenubarOpen && (
						<div className="overflow-scroll" ref={menubarRef}>
							<GlobalMenubar />
						</div>
					)}
				</div>
			)}
			{isDesktop && <GlobalMenubar />}
			{(!isMenubarOpen || isDesktop) && (
				<>
					<div className="flex justify-center">
						{project.settings && (
							<Tooltip label={t("nav.projectSettings")} side="bottom">
								<Button
									label={
										project.settings.title + (project.hasUnsavedChanges && " *")
									}
									onClick={() => dialogs.open("editProjectSettings")}
								/>
							</Tooltip>
						)}
					</div>
					<div className="flex min-w-max justify-end">
						<ExportButton
							label={
								exportProgress
									? t("nav.exportProgress", exportProgress)
									: t("nav.export")
							}
							icon={IconFileExport}
							variant="primary"
							disabled={project.settings == null || exportProgress != null}
							onClick={() => dialogs.open("exportProject")}
						/>
					</div>
				</>
			)}
		</header>
	);
};

export default GlobalHeader;
