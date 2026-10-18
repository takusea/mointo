import type { CSSProperties } from "react";

type Selection = { x: number; y: number; width: number; height: number };

type Props = {
	width: number;
	height: number;
	transform: CSSProperties;
	selection?: Selection;
	isGridVisible: boolean;
};

export const CanvasOverlay = ({
	width,
	height,
	transform,
	selection,
	isGridVisible,
}: Props) => (
	<>
		<div
			aria-hidden="true"
			className="pointer-events-none absolute top-0 left-0"
			style={{
				width,
				height,
				...transform,
				transformOrigin: "center",
			}}
		>
			{selection != null && (
				<div
					className="absolute border border-primary border-dashed bg-primary/10"
					style={{
						left: selection.x,
						top: selection.y,
						width: selection.width,
						height: selection.height,
					}}
				/>
			)}
		</div>
		{isGridVisible && (
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 [image-rendering:pixelated]"
				style={{
					width,
					height,
					...transform,
					backgroundImage:
						"linear-gradient(to right, rgb(0 0 0 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.25) 1px, transparent 1px)",
					backgroundSize: "16px 16px",
				}}
			/>
		)}
	</>
);
