import { useEffect, useState } from "react";
import Dialog from "~/components/Dialog";
import NumberField from "~/components/NumberField";
import { useI18n } from "~/features/i18n/useI18n";
import { useProject } from "~/features/project/useProject";
import { useClip } from "./useClip";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const ModifySelectionDialog = (props: Props) => {
	const { t } = useI18n();
	const clip = useClip();
	const project = useProject();
	const [amount, setAmount] = useState(1);

	useEffect(() => {
		if (props.open) setAmount(1);
	}, [props.open]);

	const maxAmount = project.settings
		? Math.max(project.settings.width, project.settings.height)
		: 1;

	return (
		<Dialog
			{...props}
			title={t("dialog.modifySelection.title")}
			description={t("dialog.modifySelection.description")}
			cancelText={t("common.cancel")}
			submitText={t("common.apply")}
			onSubmit={() => clip.modifySelection(amount)}
		>
			<div className="flex flex-col gap-2">
				<NumberField
					id="selection-modify-amount"
					aria-label={t("dialog.modifySelection.amount")}
					value={amount}
					min={-maxAmount}
					max={maxAmount}
					rightElement="px"
					step={1}
					onValueChange={setAmount}
				/>
			</div>
		</Dialog>
	);
};

export default ModifySelectionDialog;
