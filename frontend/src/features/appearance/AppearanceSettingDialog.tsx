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
			<div className="flex flex-col gap-4">
				<section className="flex flex-col gap-2">
					<h3 className="font-bold">{t("dialog.appearance.theme")}</h3>
					<p className="text-foreground-muted">
						{t("dialog.appearance.themeDescription")}
					</p>
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
				</section>
				<section className="flex flex-col gap-2">
					<h3 className="font-bold">{t("dialog.appearance.accent")}</h3>
					<p className="text-foreground-muted">
						{t("dialog.appearance.accentDescription")}
					</p>
					<Switch
						label={t("dialog.appearance.monochrome")}
						checked={appearance.isMono}
						onCheckedChange={appearance.setIsMono}
					/>
					<div
						className="flex justify-between gap-1 aria-disabled:opacity-50"
						aria-disabled={appearance.isMono}
					>
						<span className="font-medium">
							{t("dialog.appearance.accentLabel")}
						</span>
						<span>{appearance.accentColor}</span>
					</div>
					<Slider
						id="accent-color"
						disabled={appearance.isMono}
						min={0}
						max={360}
						value={[appearance.accentColor]}
						onValueChange={(value) => {
							appearance.setAccentColor(value[0]);
						}}
						aria-label={t("dialog.appearance.accentLabel")}
					/>
				</section>
			</div>
		</Dialog>
	);
};

export default AppearanceSettingsDialog;
