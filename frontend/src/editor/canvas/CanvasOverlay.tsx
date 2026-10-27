import type { CSSProperties } from "react";

type Selection = {
	x: number;
	y: number;
	width: number;
	height: number;
	points?: { x: number; y: number }[];
	mask?: Uint8Array;
};

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
			className="pointer-events-none absolute top-0 left-0 origin-center mix-blend-exclusion"
			style={{
				width,
				height,
				...transform,
			}}
		>
			{selection != null &&
			(selection.points != null || selection.mask != null) ? (
				<svg
					className="absolute overflow-visible"
					style={{
						left: selection.x,
						top: selection.y,
						width: selection.width,
						height: selection.height,
					}}
					viewBox={`0 0 ${selection.width} ${selection.height}`}
					aria-hidden="true"
				>
					{selection.points != null ? (
						<polygon
							points={selection.points
								.map(
									(point) =>
										`${point.x - selection.x + 0.5},${point.y - selection.y + 0.5}`,
								)
								.join(" ")}
							fill="none"
							stroke="white"
							strokeDasharray="3 2"
							vectorEffect="non-scaling-stroke"
						/>
					) : (
						<path
							d={(() => {
								const edges: string[] = [];
								const selected = (x: number, y: number) =>
									x >= 0 &&
									y >= 0 &&
									x < width &&
									y < height &&
									selection.mask?.[y * width + x] === 1;
								for (
									let y = selection.y;
									y < selection.y + selection.height;
									y++
								)
									for (
										let x = selection.x;
										x < selection.x + selection.width;
										x++
									)
										if (selected(x, y)) {
											const lx = x - selection.x,
												ly = y - selection.y;
											if (!selected(x, y - 1)) edges.push(`M${lx},${ly}h1`);
											if (!selected(x + 1, y)) edges.push(`M${lx + 1},${ly}v1`);
											if (!selected(x, y + 1)) edges.push(`M${lx},${ly + 1}h1`);
											if (!selected(x - 1, y)) edges.push(`M${lx},${ly}v1`);
										}
								return edges.join("");
							})()}
							fill="none"
							stroke="white"
							strokeDasharray="3 2"
							vectorEffect="non-scaling-stroke"
						/>
					)}
				</svg>
			) : (
				selection != null && (
					<div
						className="absolute border border-dashed border-white"
						style={{
							left: selection.x,
							top: selection.y,
							width: selection.width,
							height: selection.height,
						}}
					/>
				)
			)}
			{transformBounds != null && (
				<div
					className="absolute border border-white"
					style={{
						left: transformBounds.x,
						top: transformBounds.y,
						width: transformBounds.width,
						height: transformBounds.height,
						transform: `rotate(${transformRotation}rad)`,
						transformOrigin: "center",
					}}
				>
					<div className="absolute -top-1 -left-1 size-2 border border-white bg-black" />
					<div className="absolute -top-1 -right-1 size-2 border border-white bg-black" />
					<div className="absolute -bottom-1 -left-1 size-2 border border-white bg-black" />
					<div className="absolute -right-1 -bottom-1 size-2 border border-white bg-black" />
					<div className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 border border-white bg-black" />
					<div className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 border border-white bg-black" />
					<div className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 border border-white bg-black" />
					<div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 border border-white bg-black" />
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
