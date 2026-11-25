import type { HSVAColor } from "~/lib/color";

type Props = {
	currentColor: HSVAColor;
	onCurrentColorChange: (color: HSVAColor) => void;
};

const ColorPicker = ({ currentColor, onCurrentColorChange }: Props) => {
	const updateHue = (event: React.PointerEvent) => {
		if (event.buttons === 0) return;

		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left - event.currentTarget.clientWidth / 2;
		const y = event.clientY - rect.top - event.currentTarget.clientHeight / 2;
		const angle = (Math.atan2(y, x) * 180) / Math.PI;

		onCurrentColorChange({
			...currentColor,
			h: (angle + 510) % 360,
		});
	};

	const handleHuePointerDown = (event: React.PointerEvent) => {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		updateHue(event);
	};

	const updateSL = (event: React.PointerEvent) => {
		if (event.buttons === 0) return;

		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const s = Math.max(0, Math.min(x / event.currentTarget.clientWidth, 1));
		const v = Math.max(
			0,
			Math.min(1 - y / event.currentTarget.clientHeight, 1),
		);

		onCurrentColorChange({
			...currentColor,
			s,
			v,
		});
	};

	const handleSLPointerDown = (event: React.PointerEvent) => {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		updateSL(event);
	};

	return (
		<div className="relative mx-auto flex w-full max-w-64 flex-col gap-1">
			<div
				className="absolute inset-0 touch-none rounded-full bg-[conic-gradient(in_hsl,hsl(60_100%_50%),hsl(180_100%_50%),hsl(300_100%_50%),hsl(420_100%_50%))] mask-[radial-gradient(transparent,transparent_60%,white_61%,white)]"
				onPointerDown={handleHuePointerDown}
				onPointerMove={updateHue}
			>
				<div
					style={{
						top: `${50 + Math.sin(currentColor.h / 57 - 2.6) * 46}%`,
						left: `${50 + Math.cos(currentColor.h / 57 - 2.6) * 46}%`,
					}}
					className="pointer-events-none absolute h-2 w-2 translate-x-[-50%] translate-y-[-50%] rounded-full border border-black shadow-inner shadow-white"
				/>
			</div>
			<div
				style={{ "--hue": currentColor.h } as React.CSSProperties}
				className="aspect-square touch-none p-[20%]"
			>
				<div
					className="relative size-full bg-[linear-gradient(to_bottom,#fff0_0%,#000_100%),linear-gradient(to_right,#fff_0%,hsl(var(--hue)_100%_50%)_100%)]"
					onPointerDown={handleSLPointerDown}
					onPointerMove={updateSL}
				>
					<div
						style={{
							bottom: `${currentColor.v * 100}%`,
							left: `${currentColor.s * 100}%`,
						}}
						className="pointer-events-none absolute h-2 w-2 translate-x-[-50%] translate-y-[50%] rounded-full border border-black shadow-inner shadow-white"
					/>
				</div>
			</div>
		</div>
	);
};

export default ColorPicker;
