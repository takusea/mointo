import Dialog from "~/components/Dialog";
import { useI18n } from "~/features/i18n/useI18n";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const AboutDialog = (props: Props) => {
	const { t } = useI18n();

	return (
		<Dialog {...props} title={t("about.title")} cancelText={t("common.close")}>
			<div className="grid grid-cols-[auto_1fr] gap-2">
				<img
					src="favicon.png"
					width={16}
					height={16}
					alt=""
					className="w-16 [image-rendering:pixelated]"
				/>
				<div className="flex flex-col gap-2">
					<span className="text-lg font-bold">mointo</span>
					<span>Ver 0.0.1</span>
				</div>
			</div>
		</Dialog>
	);
};

export default AboutDialog;
