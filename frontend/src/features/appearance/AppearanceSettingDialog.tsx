import Dialog from "~/components/Dialog";
import RadioGroup from "~/components/RadioGroup/RadioGroup";
import RadioGroupItem from "~/components/RadioGroup/RadioGroupItem";
import Slider from "~/components/Slider";
import Switch from "~/components/Switch";
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
			title={t("dialog.appearance.title")}
			cancelText={t("common.close")}
		>
			<div className="flex flex-col gap-2">
				<span className="font-medium">{t("dialog.appearance.theme")}</span>
				<p>{t("dialog.appearance.themeDescription")}</p>
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
						label={t("dialog.appearance.themeSystem")}
						id="themeSystem"
					/>
					<RadioGroupItem
						value="light"
						label={t("dialog.appearance.themeLight")}
						id="themeLight"
					/>
					<RadioGroupItem
						value="dark"
						label={t("dialog.appearance.themeDark")}
						id="themeDark"
					/>
				</RadioGroup>
				<span className="font-medium">{t("dialog.appearance.accent")}</span>
				<p>{t("dialog.appearance.accentDescription")}</p>
				<Switch
					label={t("dialog.appearance.monochrome")}
					checked={appearance.isMono}
					onCheckedChange={appearance.setIsMono}
				/>
				<Slider
					id="accent-color"
					disabled={appearance.isMono}
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
