import { IconKeyframe } from "@tabler/icons-react";
import Card from "~/components/Card";
import IconButton from "~/components/IconButton";
import NumberField from "~/components/NumberField";
import { useI18n } from "~/features/i18n/useI18n";
import type { Transform } from "~/lib/transform";

type Key = { frame: number; transform: Transform };
type Props = {
	transform: Transform;
	frame: number;
	keys: Key[];
	onChange: (value: Transform) => void;
	onRemove: () => void;
};

export default function CameraInspector({
	transform,
	frame,
	keys,
	onChange,
	onRemove,
}: Props) {
	const { t } = useI18n();
	const current = [...keys].sort((a, b) => a.frame - b.frame);
	const left = [...current].reverse().find((key) => key.frame <= frame);
	const right = current.find((key) => key.frame >= frame);
	let value = transform;
	if (left && right && left.frame !== right.frame) {
		const mix = (a: number, b: number) =>
			a + (b - a) * ((frame - left.frame) / (right.frame - left.frame));
		value = {
			position: [
				mix(left.transform.position[0], right.transform.position[0]),
				mix(left.transform.position[1], right.transform.position[1]),
			],
			rotation: mix(left.transform.rotation, right.transform.rotation),
			scale: [
				mix(left.transform.scale[0], right.transform.scale[0]),
				mix(left.transform.scale[1], right.transform.scale[1]),
			],
			anchor: [0.5, 0.5],
		};
	} else if (left || right) value = (left ?? right)!.transform;
	const update = (property: "x" | "y" | "rotation" | "zoom", next: number) => {
		const nextTransform = {
			...value,
			position: [...value.position] as [number, number],
			scale: [...value.scale] as [number, number],
		};
		if (property === "x") nextTransform.position[0] = next;
		if (property === "y") nextTransform.position[1] = next;
		if (property === "rotation") nextTransform.rotation = next;
		if (property === "zoom") nextTransform.scale = [next, next];
		onChange(nextTransform);
	};
	return (
		<Card size="small">
			<div className="flex flex-col gap-2">
				<strong>{t("camera.title")}</strong>
				<div className="grid grid-cols-2 gap-1">
					<NumberField
						aria-label={t("inspector.positionX")}
						value={value.position[0]}
						rightElement="px"
						onValueChange={(n) => update("x", n)}
					/>
					<NumberField
						aria-label={t("inspector.positionY")}
						value={value.position[1]}
						rightElement="px"
						onValueChange={(n) => update("y", n)}
					/>
					<NumberField
						aria-label={t("inspector.rotation")}
						value={value.rotation}
						rightElement="°"
						onValueChange={(n) => update("rotation", n)}
					/>
					<NumberField
						aria-label={t("camera.zoom")}
						min={0.1}
						max={8}
						step={0.1}
						value={value.scale[0]}
						rightElement="°"
						onValueChange={(n) => update("zoom", n)}
					/>
				</div>
				<IconButton
					label={t(
						keys.some((key) => key.frame === frame)
							? "camera.removeKeyframe"
							: "camera.addKeyframe",
						{ frame },
					)}
					icon={IconKeyframe}
					aria-pressed={keys.some((key) => key.frame === frame)}
					variant={
						keys.some((key) => key.frame === frame) ? "primary" : "default"
					}
					onClick={() =>
						keys.some((key) => key.frame === frame)
							? onRemove()
							: onChange(value)
					}
				/>
			</div>
		</Card>
	);
}
