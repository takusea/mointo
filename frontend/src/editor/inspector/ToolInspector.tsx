import Card from "~/components/Card";
import Slider from "~/components/Slider";
import Switch from "~/components/Switch";
import type { ToolProperty } from "~/core/CoreService";
import type { MessageKey } from "~/features/i18n/I18nContext";
import { useI18n } from "~/features/i18n/useI18n";
import type { LayerReferenceTool } from "~/features/tool/ToolContext";
import type { ToolKind } from "~/features/tool/type";
import { useTool } from "~/features/tool/useTool";

const toolNameKeys = {
	move: "tool.name.move",
	pen: "tool.name.pen",
	eraser: "tool.name.eraser",
	fill: "tool.name.fill",
	select: "tool.name.select",
	lasso: "tool.name.lasso",
	wand: "tool.name.wand",
	eyedropper: "tool.name.eyedropper",
} as const satisfies Record<ToolKind, MessageKey>;

type Props = {
	properties: ToolProperty[];
	onPropertyChange: (key: string, value: unknown) => void;
};

const ToolInspector = ({ properties, onPropertyChange }: Props) => {
	const { t } = useI18n();
	const toolContext = useTool();

	return (
		<Card>
			<div className="flex flex-col gap-2">
				<h2 className="font-bold">
					{t("toolInspector.propertyOfTool", {
						tool: t(toolNameKeys[toolContext.tool]),
					})}
				</h2>
				{properties.map((property) => {
					const numericValue =
						typeof property.value === "number"
							? property.value
							: Number(property.value);
					const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

					return (
						<div key={property.name}>
							<div className="flex justify-between gap-1">
								<span className="font-medium">
									{t(`toolInspector.${property.name}` as MessageKey)}
								</span>
								<span>{`${String(property.value)}${property.unit ?? ""}`}</span>
							</div>
							<Slider
								min={property.min}
								max={property.max}
								step={property.step}
								value={[safeValue]}
								onValueChange={(value) => {
									onPropertyChange(property.name, value[0]);
								}}
							/>
						</div>
					);
				})}
				{(["fill", "eyedropper", "wand"] as ToolKind[]).includes(
					toolContext.tool,
				) && (
					<Switch
						label={t("toolInspector.referenceOtherLayers")}
						checked={
							toolContext.referenceOtherLayers[
								toolContext.tool as LayerReferenceTool
							]
						}
						onCheckedChange={(enabled) =>
							toolContext.setReferenceOtherLayers(
								toolContext.tool as LayerReferenceTool,
								enabled,
							)
						}
					/>
				)}
			</div>
		</Card>
	);
};

export default ToolInspector;
