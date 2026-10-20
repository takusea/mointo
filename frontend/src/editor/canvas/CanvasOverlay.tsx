import type { CSSProperties } from "react";

type Selection = { x: number; y: number; width: number; height: number };

type Props = {
	width: number;
	height: number;
	transform: CSSProperties;
	selection?: Selection;
	transformBounds?: Selection;
	transformRotation?: number;
	isGridVisible: boolean;
};

export const CanvasOverlay = ({
	width,
	height,
	transform,
	selection,
	transformBounds,
	transformRotation = 0,
	isGridVisible,
}: Props) => (
	<>
		<div
			aria-hidden="true"
			className="pointer-events-none absolute top-0 left-0 origin-center"
			style={{
				width,
				height,
				...transform,
			}}
		>
			{selection != null && (
				<div
					className="absolute border border-primary border-dashed"
					style={{
						left: selection.x,
						top: selection.y,
						width: selection.width,
						height: selection.height,
					}}
				/>
			)}
			{transformBounds != null && (
				<div
					className="absolute border border-primary"
					style={{
						left: transformBounds.x,
						top: transformBounds.y,
						width: transformBounds.width,
						height: transformBounds.height,
						transform: `rotate(${transformRotation}rad)`,
						transformOrigin: "center",
					}}
				>
					<div className="absolute -top-1 -left-1 size-2 border border-primary bg-white" />
					<div className="absolute -top-1 -right-1 size-2 border border-primary bg-white" />
					<div className="absolute -bottom-1 -left-1 size-2 border border-primary bg-white" />
					<div className="absolute -right-1 -bottom-1 size-2 border border-primary bg-white" />
					<div className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 border border-primary bg-white" />
					<div className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 border border-primary bg-white" />
					<div className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 border border-primary bg-white" />
					<div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 border border-primary bg-white" />
				</div>
			)}
		</div>
		{isGridVisible && (
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-size-[16px_16px] [image-rendering:pixelated]"
				style={{
					width,
					height,
					...transform,
					backgroundImage:
						"linear-gradient(to right, rgb(0 0 0 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.25) 1px, transparent 1px)",
				}}
			/>
		)}
	</>
);
