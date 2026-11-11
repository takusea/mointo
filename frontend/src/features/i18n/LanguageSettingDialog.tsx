import Dialog from "~/components/Dialog";
import RadioGroup from "~/components/RadioGroup/RadioGroup";
import RadioGroupItem from "~/components/RadioGroup/RadioGroupItem";
import { useI18n } from "./useI18n";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const LanguageSettingDialog = (props: Props) => {
	const { locale, setLocale, t } = useI18n();

	return (
		<Dialog
			{...props}
			title={t("dialog.language.title")}
			cancelText={t("common.close")}
		>
			<div className="flex flex-col gap-2">
				<p>{t("dialog.language.languageDescription")}</p>
				<RadioGroup
					value={locale}
					onValueChange={(value) => {
						if (value === "en" || value === "ja") {
							setLocale(value);
						}
					}}
				>
					<RadioGroupItem
						value="en"
						label={t("dialog.language.english")}
						id="langEn"
					/>
					<RadioGroupItem
						value="ja"
						label={t("dialog.language.japanese")}
						id="langJa"
					/>
				</RadioGroup>
			</div>
		</Dialog>
	);
};

export default LanguageSettingDialog;
