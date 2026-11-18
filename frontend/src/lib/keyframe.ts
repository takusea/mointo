import type { Transform } from "./transform";

export type KeyframeValue = number | [number, number];

export type Keyframe = {
	frame: number;
	property: string;
	value: KeyframeValue;
};

export const evaluateKeyframes = (
	keys: Keyframe[],
	previews: Keyframe[],
	frame: number,
	fallback: Transform,
	defaultOpacity: number,
) => {
	const scalar = (property: string, base: number) => {
		const preview = previews.find(
			(key) => key.frame === frame && key.property === property,
		);
		if (preview) return preview.value as number;
		const ordered = keys
			.filter((key) => key.property === property)
			.sort((a, b) => a.frame - b.frame);
		const left = [...ordered].reverse().find((key) => key.frame <= frame);
		const right = ordered.find((key) => key.frame >= frame);
		if (!left) return (right?.value as number | undefined) ?? base;
		if (!right || left.frame === right.frame) return left.value as number;
		const a = left.value as number;
		const b = right.value as number;
		return a + (b - a) * ((frame - left.frame) / (right.frame - left.frame));
	};
	const pair = (property: string, base: [number, number]): [number, number] => {
		const preview = previews.find(
			(key) => key.frame === frame && key.property === property,
		);
		if (preview) return preview.value as [number, number];
		const ordered = keys
			.filter((key) => key.property === property)
			.sort((a, b) => a.frame - b.frame);
		const left = [...ordered].reverse().find((key) => key.frame <= frame);
		const right = ordered.find((key) => key.frame >= frame);
		const a = (left?.value ?? right?.value ?? base) as [number, number];
		if (!left || !right || left.frame === right.frame) return a;
		const b = right.value as [number, number];
		const t = (frame - left.frame) / (right.frame - left.frame);
		return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
	};
	return {
		transform: {
			position: pair("position", fallback.position),
			rotation: scalar("rotation", fallback.rotation),
			scale: pair("scale", fallback.scale),
			anchor: pair("anchor", fallback.anchor),
		},
		opacity: scalar("opacity", defaultOpacity),
	};
};
