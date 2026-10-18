import {
	IconAlpha,
	IconArrowAutofitHeight,
	IconArrowAutofitWidth,
	IconArrowsHorizontal,
	IconArrowsMoveHorizontal,
	IconArrowsMoveVertical,
	IconEye,
	IconEyeOff,
	IconLayoutAlignLeft,
	IconLock,
	IconLockOpen,
	IconRotate,
} from "@tabler/icons-react";
import Card from "~/components/Card";
import IconButton from "~/components/IconButton";
import NumberField from "~/components/NumberField";
import Select from "~/components/Select/Select";
import SelectItem from "~/components/Select/SelectItem";
import Separator from "~/components/Separator";
import TextField from "~/components/TextField";
import { useI18n } from "~/features/i18n/useI18n";
import type { ClipMetadata, ClipProperties } from "~/lib/clip";
import type { Transform } from "~/lib/transform";

type Props = {
	clip: ClipMetadata;
	isLayerLocked: boolean;
	transform: Transform;
	onStartChange: (start: number) => void;
	onDurationChange: (duration: number) => void;
	onNameChange: (name: string) => void;
	onSizeChange: (width: number, height: number) => void;
	onPropertiesChange: (properties: Partial<ClipProperties>) => void;
	onTransformChange: (transform: Transform) => void;
	onInteractionStart: () => void;
	onInteractionEnd: () => void;
};

const ClipInspector = ({
	clip,
	isLayerLocked,
	transform,
	onStartChange,
	onDurationChange,
	onNameChange,
	onSizeChange,
	onPropertiesChange,
	onTransformChange,
	onInteractionStart,
	onInteractionEnd,
}: Props) => {
	const { t } = useI18n();
	const isLocked = clip.locked || isLayerLocked;

	return (
		<Card>
			<div className="flex flex-col gap-2">
				<h2 className="font-bold">
					{t("inspector.propertyOf", { name: clip.name })}
				</h2>
				<div className="flex gap-1">
					<IconButton
						icon={clip.hidden ? IconEyeOff : IconEye}
						label={clip.hidden ? t("inspector.show") : t("inspector.hide")}
						variant={clip.hidden ? "primary" : undefined}
						aria-pressed={clip.hidden}
						disabled={isLocked}
						onClick={() => onPropertiesChange({ hidden: !clip.hidden })}
					/>
					<IconButton
						icon={IconAlpha}
						label={t("inspector.lockAlpha")}
						variant={clip.alpha_locked ? "primary" : undefined}
						aria-pressed={clip.alpha_locked}
						disabled={isLocked}
						onClick={() =>
							onPropertiesChange({
								alpha_locked: !clip.alpha_locked,
							})
						}
					/>
					<IconButton
						icon={isLocked ? IconLock : IconLockOpen}
						label={isLocked ? t("inspector.unlock") : t("inspector.lock")}
						variant={isLocked ? "primary" : undefined}
						aria-pressed={isLocked}
						onClick={() => onPropertiesChange({ locked: !isLocked })}
					/>
				</div>
				<span className="font-medium">{t("inspector.name")}</span>
				<TextField
					key={`${clip.id}:${clip.name}`}
					id="clipName"
					defaultValue={clip.name}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur();
					}}
					onBlur={(event) => {
						const nextName = event.currentTarget.value.trim();
						if (nextName.length === 0) {
							event.currentTarget.value = clip.name;
							return;
						}
						event.currentTarget.value = nextName;
						if (nextName !== clip.name) onNameChange(nextName);
					}}
				/>
				<Separator />
				<span className="font-medium">{t("inspector.size")}</span>
				<div className="grid grid-cols-2 gap-2">
					<NumberField
						id="clipWidth"
						aria-label={t("inspector.width")}
						min={1}
						value={clip.width}
						disabled={isLocked}
						leftElement={<IconArrowAutofitWidth />}
						rightElement="px"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(width) => onSizeChange(width, clip.height)}
					/>
					<NumberField
						id="clipHeight"
						aria-label={t("inspector.height")}
						min={1}
						value={clip.height}
						disabled={isLocked}
						leftElement={<IconArrowAutofitHeight />}
						rightElement="px"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(height) => onSizeChange(clip.width, height)}
					/>
				</div>
				<Separator />
				<span className="font-medium">{t("inspector.framePosition")}</span>
				<div className="grid grid-cols-2 gap-2">
					<NumberField
						id="clipStart"
						aria-label={t("inspector.start")}
						min={0}
						value={clip.start}
						disabled={isLocked}
						leftElement={<IconLayoutAlignLeft />}
						rightElement="f"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={onStartChange}
					/>
					<NumberField
						id="clipLength"
						aria-label={t("inspector.length")}
						min={1}
						value={clip.duration}
						disabled={isLocked}
						leftElement={<IconArrowsHorizontal />}
						rightElement="f"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={onDurationChange}
					/>
				</div>
				<Separator />
				<span className="font-medium">{t("inspector.position")}</span>
				<div className="grid grid-cols-2 gap-2">
					<NumberField
						id="clipPosition"
						aria-label={t("inspector.positionX")}
						value={transform.position[0]}
						disabled={isLocked}
						leftElement={<IconArrowsMoveHorizontal />}
						rightElement="px"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(value) => {
							onTransformChange({
								...transform,
								position: [value, transform.position[1]],
							});
						}}
					/>
					<NumberField
						id="clipPositionY"
						aria-label={t("inspector.positionY")}
						value={transform.position[1]}
						disabled={isLocked}
						leftElement={<IconArrowsMoveVertical />}
						rightElement="px"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(value) => {
							onTransformChange({
								...transform,
								position: [transform.position[0], value],
							});
						}}
					/>
				</div>
				<span className="font-medium">{t("inspector.anchor")}</span>
				<div className="grid grid-cols-2 gap-2">
					<NumberField
						id="clipAnchor"
						aria-label={t("inspector.anchorX")}
						min={0}
						max={1}
						step={0.01}
						value={transform.anchor[0]}
						disabled={isLocked}
						leftElement={<IconArrowsMoveHorizontal />}
						rightElement="px"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(value) => {
							onTransformChange({
								...transform,
								anchor: [value, transform.anchor[1]],
							});
						}}
					/>
					<NumberField
						id="clipAnchorY"
						aria-label={t("inspector.anchorY")}
						min={0}
						max={1}
						step={0.01}
						value={transform.anchor[1]}
						disabled={isLocked}
						leftElement={<IconArrowsMoveVertical />}
						rightElement="px"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(value) => {
							onTransformChange({
								...transform,
								anchor: [transform.anchor[0], value],
							});
						}}
					/>
				</div>
				<span className="font-medium">{t("inspector.rotation")}</span>
				<NumberField
					id="clipRotation"
					aria-label={t("inspector.rotation")}
					min={0}
					max={360}
					value={transform.rotation}
					disabled={isLocked}
					leftElement={<IconRotate />}
					rightElement="°"
					onInteractionStart={onInteractionStart}
					onInteractionEnd={onInteractionEnd}
					onValueChange={(value) => {
						onTransformChange({
							...transform,
							rotation: value,
						});
					}}
				/>
				<span className="font-medium">{t("inspector.scale")}</span>
				<div className="grid grid-cols-2 gap-2">
					<NumberField
						id="clipScale"
						aria-label={t("inspector.scaleX")}
						min={0}
						max={1000}
						value={transform.scale[0] * 100}
						disabled={isLocked}
						leftElement={<IconArrowsMoveHorizontal />}
						rightElement="%"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(value) => {
							onTransformChange({
								...transform,
								scale: [value / 100, transform.scale[1]],
							});
						}}
					/>
					<NumberField
						id="clipScaleY"
						aria-label={t("inspector.scaleY")}
						min={0}
						max={1000}
						value={transform.scale[1] * 100}
						disabled={isLocked}
						leftElement={<IconArrowsMoveVertical />}
						rightElement="%"
						onInteractionStart={onInteractionStart}
						onInteractionEnd={onInteractionEnd}
						onValueChange={(value) => {
							onTransformChange({
								...transform,
								scale: [transform.scale[0], Math.round(value / 100)],
							});
						}}
					/>
				</div>
				<Separator />
				<span className="font-medium">{t("inspector.opacity")}</span>
				<NumberField
					id="clipOpacity"
					aria-label={t("inspector.opacity")}
					min={0}
					max={100}
					value={clip.opacity * 100}
					disabled={isLocked}
					leftElement={<IconAlpha />}
					rightElement="%"
					onInteractionStart={onInteractionStart}
					onInteractionEnd={onInteractionEnd}
					onValueChange={(value) =>
						onPropertiesChange({ opacity: value / 100 })
					}
				/>
				<span className="font-medium">{t("inspector.blendMode")}</span>
				<Select
					id="clipBlendMode"
					value={clip.blend_mode}
					disabled={isLocked}
					onValueChange={(blend_mode) =>
						(blend_mode === "normal" ||
							blend_mode === "multiply" ||
							blend_mode === "screen" ||
							blend_mode === "add") &&
						onPropertiesChange({ blend_mode })
					}
				>
					<SelectItem value="normal">
						{t("inspector.blendMode.normal")}
					</SelectItem>
					<SelectItem value="multiply">
						{t("inspector.blendMode.multiply")}
					</SelectItem>
					<SelectItem value="screen">
						{t("inspector.blendMode.screen")}
					</SelectItem>
					<SelectItem value="add">{t("inspector.blendMode.add")}</SelectItem>
				</Select>
			</div>
		</Card>
	);
};

export default ClipInspector;
