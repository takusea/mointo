import { useState } from "react";
import Dialog from "~/components/Dialog";
import Select from "~/components/Select/Select";
import SelectItem from "~/components/Select/SelectItem";
import { useDialogs } from "~/editor/dialogs/useDialogs";
import { useI18n } from "~/features/i18n/useI18n";
import type { ProjectExportFormat } from "./projectExport";
import { isProjectExportFormat, projectExporters } from "./projectExporters";
import { useProjectExport } from "./useProjectExport";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const ProjectExportDialog = (props: Props) => {
	const { t } = useI18n();
	const dialogs = useDialogs();
	const { exportAs } = useProjectExport();
	const [format, setFormat] = useState<ProjectExportFormat>("gif");

	return (
		<Dialog
			{...props}
			title={t("projectExport.title")}
			cancelText={t("common.cancel")}
			submitText={t("nav.export")}
			onSubmit={() => {
				dialogs.close();
				void exportAs(format);
			}}
		>
			<div className="flex flex-col gap-2">
				<span className="font-medium">{t("projectExport.format")}</span>
				<Select
					id="project-export-format"
					label={t("projectExport.format")}
					value={format}
					onValueChange={(value) => {
						if (isProjectExportFormat(value)) {
							setFormat(value);
						}
					}}
				>
					{projectExporters.map((exporter) => (
						<SelectItem key={exporter.format} value={exporter.format}>
							{t(exporter.labelKey)}
						</SelectItem>
					))}
				</Select>
			</div>
		</Dialog>
	);
};

export default ProjectExportDialog;
