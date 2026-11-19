import { IconBrandGithub } from "@tabler/icons-react";
import Button from "~/components/Button";
import Dialog from "~/components/Dialog";
import { useI18n } from "~/features/i18n/useI18n";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const AboutDialog = (props: Props) => {
	const { t } = useI18n();

	return (
		<Dialog
			{...props}
			title={t("dialog.about.title")}
			cancelText={t("common.close")}
		>
			<div className="flex flex-col items-center gap-4 text-center">
				<img src="about.gif" className="rounded-md" alt="" />
				<div>
					<div className="text-lg font-bold">mointo</div>
					<div>
						{__APP_VERSION__} {__BUILD_DATE__}
					</div>
				</div>
				<a href="https://github.com/takusea/mointo">
					<Button icon={IconBrandGithub} label="GitHub" />
				</a>
				<div>©2026 takusea</div>
			</div>
		</Dialog>
	);
};

export default AboutDialog;
