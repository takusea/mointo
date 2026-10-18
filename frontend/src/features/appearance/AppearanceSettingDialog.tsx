import Dialog from "~/components/Dialog";
import RadioGroup from "~/components/RadioGroup/RadioGroup";
import RadioGroupItem from "~/components/RadioGroup/RadioGroupItem";
import Slider from "~/components/Slider";
import { useI18n } from "../i18n/useI18n";
import { useAppearance } from "./useAppearance";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const AppearanceSettingsDialog = (props: Props) => {
	const { t } = useI18n();
	const appearance = useAppearance();

	return (
		<Dialog
			{...props}
			title={t("appearanceSettings.title")}
			cancelText={t("common.close")}
		>
			<div className="flex flex-col gap-2">
				<span className="font-medium">{t("appearanceSettings.theme")}</span>
				<p>{t("appearanceSettings.themeDescription")}</p>
				<RadioGroup
					value={appearance.ternaryDarkMode}
					onValueChange={(value) => {
						if (value === "system" || value === "light" || value === "dark") {
							appearance.setTernaryDarkMode(value);
						}
					}}
				>
					<RadioGroupItem
						value="system"
						label={t("appearanceSettings.themeSystem")}
						id="themeSystem"
					/>
					<RadioGroupItem
						value="light"
						label={t("appearanceSettings.themeLight")}
						id="themeLight"
					/>
					<RadioGroupItem
						value="dark"
						label={t("appearanceSettings.themeDark")}
						id="themeDark"
					/>
				</RadioGroup>
				<span className="font-medium">{t("appearanceSettings.accent")}</span>
				<p>{t("appearanceSettings.accentDescription")}</p>
				<Slider
					id="accent-color"
					min={0}
					max={360}
					value={[appearance.accentColor]}
					onValueChange={(value) => {
						appearance.setAccentColor(value[0]);
					}}
				/>
			</div>
		</Dialog>
	);
};

export default AppearanceSettingsDialog;
