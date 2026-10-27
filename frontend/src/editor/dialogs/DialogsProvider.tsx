import { type JSX, useState } from "react";
import AppearanceSettingsDialog from "~/features/appearance/AppearanceSettingDialog";
import LanguageSettingDialog from "~/features/i18n/LanguageSettingDialog";
import ProjectExportDialog from "~/features/io/export/ProjectExportDialog";
import CreateNewProjectDialog from "~/features/project/CreateNewProjectDialog";
import EditCompositionSettingsDialog from "~/features/project/EditCompositionSettingsDialog";
import ShortcutSettingsDialog from "~/features/shortcuts/ShortcutSettingsDialog";
import InputSettingsDialog from "~/features/tool/InputSettingsDialog";
import AboutDialog from "./AboutDialog";
import { type AppDialog, DialogsContext } from "./DialogsContext";

type Props = {
	children: JSX.Element;
};

export const DialogsProvider = ({ children }: Props) => {
	const [activeDialog, setActiveDialog] = useState<AppDialog | null>(null);
	const handleOpenChange = (dialog: AppDialog) => (open: boolean) => {
		setActiveDialog((active) =>
			open ? dialog : active === dialog ? null : active,
		);
	};

	return (
		<DialogsContext
			value={{
				open: setActiveDialog,
				close: () => setActiveDialog(null),
			}}
		>
			{children}
			<CreateNewProjectDialog
				open={activeDialog === "createProject"}
				onOpenChange={handleOpenChange("createProject")}
			/>
			<EditCompositionSettingsDialog
				open={activeDialog === "editCompositionSettings"}
				onOpenChange={handleOpenChange("editCompositionSettings")}
			/>
			<ProjectExportDialog
				open={activeDialog === "exportProject"}
				onOpenChange={handleOpenChange("exportProject")}
			/>
			<AppearanceSettingsDialog
				open={activeDialog === "appearanceSettings"}
				onOpenChange={handleOpenChange("appearanceSettings")}
			/>
			<InputSettingsDialog
				open={activeDialog === "inputSettings"}
				onOpenChange={handleOpenChange("inputSettings")}
			/>
			<LanguageSettingDialog
				open={activeDialog === "languageSettings"}
				onOpenChange={handleOpenChange("languageSettings")}
			/>
			<ShortcutSettingsDialog
				open={activeDialog === "shortcutSettings"}
				onOpenChange={handleOpenChange("shortcutSettings")}
			/>
			<AboutDialog
				open={activeDialog === "about"}
				onOpenChange={handleOpenChange("about")}
			/>
		</DialogsContext>
	);
};
