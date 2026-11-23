import {
	IconAlpha,
	IconArrowAutofitHeight,
	IconArrowAutofitRight,
	IconArrowAutofitWidth,
	IconArrowsHorizontal,
	IconArrowsMoveHorizontal,
	IconArrowsMoveVertical,
	IconCopy,
	IconEye,
	IconEyeOff,
	IconKeyframe,
	IconLayoutAlignLeft,
	IconLock,
	IconLockOpen,
	IconRotate,
	IconTrash,
	IconUnlink,
} from "@tabler/icons-react";
import Card from "~/components/Card";
import IconButton from "~/components/IconButton";
import LabeledControl from "~/components/LabeledControl";
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
	clips: ClipMetadata[];
	onUnlink: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
	isLayerLocked: boolean;
	transform: Transform;
	onStartChange: (start: number) => void;
	onDurationChange: (duration: number) => void;
	onNameChange: (name: string) => void;
	onSizeChange: (
		width: number,
		height: number,
		dimension?: "width" | "height",
	) => void;
	onPropertiesChange: (properties: Partial<ClipProperties>) => void;
	onTransformChange: (transform: Transform) => void;
	onInteractionStart: () => void;
	onInteractionEnd: () => void;
	currentFrame: number;
	keyframes: {
		frame: number;
		property: string;
		value: number | [number, number];
	}[];
	onKeyframeToggle: (
		property: string,
		value: number | [number, number],
	) => void;
	onOpacityChange: (opacity: number) => void;
	onFrameSelect: (frame: number) => void;
};

const ClipInspector = ({
	clip,
	clips,
	onUnlink,
	onDuplicate,
	onDelete,
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
	currentFrame,
	keyframes,
	onKeyframeToggle,
	onOpacityChange,
}: Props) => {
	const { t } = useI18n();
	const isLocked = clip.locked || isLayerLocked;

	return (
		<Card>
			<div className="flex flex-col gap-2">
				<h2 className="font-bold">
					{t("inspector.clip.propertyOf", { name: clip.name })}
				</h2>
				<div className="flex gap-1">
					<IconButton
						icon={clip.hidden ? IconEyeOff : IconEye}
						label={
							clip.hidden ? t("inspector.clip.show") : t("inspector.clip.hide")
						}
						variant={clip.hidden ? "primary" : undefined}
						aria-pressed={clip.hidden}
						disabled={isLocked}
						onClick={() => onPropertiesChange({ hidden: !clip.hidden })}
					/>
					{clip.clip_type === "image" && (
						<IconButton
							icon={IconAlpha}
							label={t("inspector.clip.lockAlpha")}
							variant={clip.alpha_locked ? "primary" : undefined}
							aria-pressed={clip.alpha_locked}
							disabled={isLocked}
							onClick={() =>
								onPropertiesChange({
									alpha_locked: !clip.alpha_locked,
								})
							}
						/>
					)}
					<IconButton
						icon={isLocked ? IconLock : IconLockOpen}
						label={
							isLocked ? t("inspector.clip.unlock") : t("inspector.clip.lock")
						}
						variant={isLocked ? "primary" : undefined}
						aria-pressed={isLocked}
						onClick={() => onPropertiesChange({ locked: !isLocked })}
					/>
					{clips.some(
						(candidate) =>
							(clip.clip_type === "image" || clip.clip_type === "audio") &&
							candidate.clip_type === clip.clip_type &&
							candidate.id !== clip.id &&
							candidate.asset_id === clip.asset_id,
					) && (
						<IconButton
							icon={IconUnlink}
							label={t("inspector.clip.unlinkClip")}
							onClick={onUnlink}
						/>
					)}
					<IconButton
						icon={IconCopy}
						label={t("action.edit.duplicateClip")}
						onClick={onDuplicate}
					/>
					<IconButton
						icon={IconTrash}
						label={t("action.edit.deleteClip")}
						onClick={onDelete}
					/>
				</div>
				<LabeledControl label={t("inspector.clip.name")}>
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
				</LabeledControl>
				<Separator />
				<LabeledControl label={t("inspector.clip.framePosition")}>
					<div className="grid grid-cols-2 gap-2">
						<NumberField
							id="clipStart"
							aria-label={t("inspector.clip.start")}
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
							aria-label={t("inspector.clip.length")}
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
				</LabeledControl>
				{clip.clip_type === "group" && (
					<LabeledControl label={t("inspector.clip.groupDepth")}>
						<NumberField
							id="groupClipDepth"
							aria-label={t("inspector.clip.groupDepth")}
							min={1}
							value={clip.depth}
							disabled={isLocked}
							onValueChange={(group_depth) =>
								onPropertiesChange({
									group_depth: Math.max(1, Math.floor(group_depth)),
								})
							}
						/>
					</LabeledControl>
				)}
				<Separator />
				{clip.clip_type === "audio" ? (
					<LabeledControl label={t("inspector.clip.playbackOffset")}>
						<NumberField
							id="clipAudioStartFrame"
							aria-label={t("inspector.clip.playbackOffset")}
							min={0}
							step={1}
							value={clip.audio_start_frame}
							disabled={isLocked}
							leftElement={<IconArrowAutofitRight />}
							rightElement="f"
							onInteractionStart={onInteractionStart}
							onInteractionEnd={onInteractionEnd}
							onValueChange={(audio_start_frame) =>
								onPropertiesChange({ audio_start_frame })
							}
						/>
					</LabeledControl>
				) : (
					<>
						{clip.clip_type === "image" && (
							<>
								<LabeledControl label={t("inspector.clip.size")}>
									<div className="grid grid-cols-2 gap-2">
										<NumberField
											id="clipWidth"
											aria-label={t("inspector.clip.width")}
											min={1}
											value={clip.width}
											disabled={isLocked}
											leftElement={<IconArrowAutofitWidth />}
											rightElement="px"
											onInteractionStart={onInteractionStart}
											onInteractionEnd={onInteractionEnd}
											onValueChange={(width) =>
												onSizeChange(width, clip.height, "width")
											}
										/>
										<NumberField
											id="clipHeight"
											aria-label={t("inspector.clip.height")}
											min={1}
											value={clip.height}
											disabled={isLocked}
											leftElement={<IconArrowAutofitHeight />}
											rightElement="px"
											onInteractionStart={onInteractionStart}
											onInteractionEnd={onInteractionEnd}
											onValueChange={(height) =>
												onSizeChange(clip.width, height, "height")
											}
										/>
									</div>
								</LabeledControl>
								<Separator />
							</>
						)}

						<LabeledControl
							label={t("inspector.clip.position")}
							sideElement={
								<IconButton
									icon={IconKeyframe}
									label={t("inspector.clip.togglePropertyKeyframe", {
										property: t("inspector.clip.position"),
									})}
									variant={
										keyframes.some(
											(k) =>
												k.frame === currentFrame && k.property === "position",
										)
											? "primary"
											: undefined
									}
									disabled={isLocked}
									onClick={() =>
										onKeyframeToggle("position", transform.position)
									}
								/>
							}
						>
							<div className="grid grid-cols-2 gap-2">
								<NumberField
									id="clipPosition"
									aria-label={t("inspector.clip.positionX")}
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
									aria-label={t("inspector.clip.positionY")}
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
						</LabeledControl>
						<LabeledControl
							label={t("inspector.clip.anchor")}
							sideElement={
								<IconButton
									icon={IconKeyframe}
									label={t("inspector.clip.togglePropertyKeyframe", {
										property: t("inspector.clip.anchor"),
									})}
									variant={
										keyframes.some(
											(k) =>
												k.frame === currentFrame && k.property === "anchor",
										)
											? "primary"
											: undefined
									}
									disabled={isLocked}
									onClick={() => onKeyframeToggle("anchor", transform.anchor)}
								/>
							}
						>
							<div className="grid grid-cols-2 gap-2">
								<NumberField
									id="clipAnchor"
									aria-label={t("inspector.clip.anchorX")}
									min={0}
									max={1}
									step={0.01}
									value={transform.anchor[0]}
									disabled={isLocked}
									leftElement={<IconArrowsMoveHorizontal />}
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
									aria-label={t("inspector.clip.anchorY")}
									min={0}
									max={1}
									step={0.01}
									value={transform.anchor[1]}
									disabled={isLocked}
									leftElement={<IconArrowsMoveVertical />}
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
						</LabeledControl>
						<LabeledControl
							label={t("inspector.clip.rotation")}
							sideElement={
								<IconButton
									icon={IconKeyframe}
									label={t("inspector.clip.togglePropertyKeyframe", {
										property: t("inspector.clip.rotation"),
									})}
									variant={
										keyframes.some(
											(k) =>
												k.frame === currentFrame && k.property === "rotation",
										)
											? "primary"
											: undefined
									}
									disabled={isLocked}
									onClick={() =>
										onKeyframeToggle("rotation", transform.rotation)
									}
								/>
							}
						>
							<NumberField
								id="clipRotation"
								aria-label={t("inspector.clip.rotation")}
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
						</LabeledControl>
						<LabeledControl
							label={t("inspector.clip.scale")}
							sideElement={
								<IconButton
									icon={IconKeyframe}
									label={t("inspector.clip.togglePropertyKeyframe", {
										property: t("inspector.clip.scale"),
									})}
									variant={
										keyframes.some(
											(k) => k.frame === currentFrame && k.property === "scale",
										)
											? "primary"
											: undefined
									}
									disabled={isLocked}
									onClick={() => onKeyframeToggle("scale", transform.scale)}
								/>
							}
						>
							<div className="grid grid-cols-2 gap-2">
								<NumberField
									id="clipScale"
									aria-label={t("inspector.clip.scaleX")}
									min={-1000}
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
									aria-label={t("inspector.clip.scaleY")}
									min={-1000}
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
											scale: [transform.scale[0], value / 100],
										});
									}}
								/>
							</div>
						</LabeledControl>
						<Separator />
						{clip.clip_type === "image" && (
							<>
								<LabeledControl
									label={t("inspector.clip.opacity")}
									sideElement={
										<IconButton
											icon={IconKeyframe}
											label={t("inspector.clip.togglePropertyKeyframe", {
												property: t("inspector.clip.opacity"),
											})}
											variant={
												keyframes.some(
													(k) =>
														k.frame === currentFrame &&
														k.property === "opacity",
												)
													? "primary"
													: undefined
											}
											disabled={isLocked}
											onClick={() => onKeyframeToggle("opacity", clip.opacity)}
										/>
									}
								>
									<NumberField
										id="clipOpacity"
										aria-label={t("inspector.clip.opacity")}
										min={0}
										max={100}
										value={clip.opacity * 100}
										disabled={isLocked}
										leftElement={<IconAlpha />}
										rightElement="%"
										onInteractionStart={onInteractionStart}
										onInteractionEnd={onInteractionEnd}
										onValueChange={(value) => onOpacityChange(value / 100)}
									/>
								</LabeledControl>
								<LabeledControl label={t("inspector.clip.blendMode")}>
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
											{t("inspector.clip.blendMode.normal")}
										</SelectItem>
										<SelectItem value="multiply">
											{t("inspector.clip.blendMode.multiply")}
										</SelectItem>
										<SelectItem value="screen">
											{t("inspector.clip.blendMode.screen")}
										</SelectItem>
										<SelectItem value="add">
											{t("inspector.clip.blendMode.add")}
										</SelectItem>
									</Select>
								</LabeledControl>
							</>
						)}
					</>
				)}
			</div>
		</Card>
	);
};

export default ClipInspector;
