import type { HSVAColor } from "~/lib/color";

type Props = {
	currentColor: HSVAColor;
	onCurrentColorChange: (color: HSVAColor) => void;
};

const ColorPicker = ({ currentColor, onCurrentColorChange }: Props) => {
	const handleHueMove = (event: React.PointerEvent) => {
		if (event.buttons === 0) return;

		event.currentTarget.setPointerCapture(event.pointerId);

		const rect = event?.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left - event.currentTarget.clientWidth / 2;
		const y = event.clientY - rect.top - event.currentTarget.clientHeight / 2;
		const angle = (Math.atan2(y, x) * 180) / Math.PI;

		onCurrentColorChange({
			...currentColor,
			h: (angle + 510) % 360,
		});
	};

	const handleSLMove = (event: React.PointerEvent) => {
		if (event.buttons === 0) return;

		event.currentTarget.setPointerCapture(event.pointerId);

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

	return (
		<div className="flex flex-col gap-1 max-w-64 w-full mx-auto">
			<div
				style={{ "--hue": currentColor.h } as React.CSSProperties}
				className="relative w-full h-auto aspect-square p-[20%] touch-none"
			>
				<div
					className="absolute inset-0 rounded-full bg-[conic-gradient(in_hsl,hsl(60_100%_50%),hsl(180_100%_50%),hsl(300_100%_50%),hsl(420_100%_50%))] mask-[radial-gradient(transparent,transparent_60%,white_61%,white)]"
					onPointerMove={handleHueMove}
				>
					<div
						style={{
							top: `${50 + Math.sin(currentColor.h / 57 - 2.6) * 46}%`,
							left: `${50 + Math.cos(currentColor.h / 57 - 2.6) * 46}%`,
						}}
						className="pointer-events-none absolute translate-x-[-50%] translate-y-[-50%] w-2 h-2 border border-black shadow-inner shadow-white rounded-full"
					/>
				</div>
				<div
					className="relative w-full h-full bg-[linear-gradient(to_bottom,#fff0_0%,#000_100%),linear-gradient(to_right,#fff_0%,hsl(var(--hue)_100%_50%)_100%)]"
					onPointerMove={handleSLMove}
				>
					<div
						style={{
							bottom: `${currentColor.v * 100}%`,
							left: `${currentColor.s * 100}%`,
						}}
						className="pointer-events-none absolute translate-x-[-50%] translate-y-[50%] w-2 h-2 border border-black shadow-inner shadow-white rounded-full"
					/>
				</div>
			</div>
		</div>
	);
};

export default ColorPicker;
