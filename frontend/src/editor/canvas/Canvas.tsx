import { IconBucketDroplet } from "@tabler/icons-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { useClip } from "~/features/clip/useClip";
import { useLayer } from "~/features/layer/useLayer";
import { usePlayback } from "~/features/playback/usePlayback";
import { useProject } from "~/features/project/useProject";
import { useTool } from "~/features/tool/useTool";
import { CanvasOverlay } from "./CanvasOverlay";
import { useCanvasNavigation } from "./useCanvasNavigation";
import { useCanvasPointer } from "./useCanvasPointer";
import { useCanvasRender } from "./useCanvasRender";
import { useCanvasView } from "./useCanvasView";

const DrawCanvas = () => {
	const projectContext = useProject();
	const playbackContext = usePlayback();
	const clipContext = useClip();
	const layerContext = useLayer();
	const toolContext = useTool();
	const isDesktop = useMediaQuery("(min-width: 720px)");
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const canvasRender = useCanvasRender();
	const canvasView = useCanvasView();
	const canvasPointer = useCanvasPointer(
		canvasRef,
		canvasView,
		canvasView.isOnionSkin,
		canvasRender.render,
	);
	const canvasNavigation = useCanvasNavigation(canvasRef, canvasView);
	const canvasWidth = projectContext.settings?.width;
	const canvasHeight = projectContext.settings?.height;
	const [cursorPosition, setCursorPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [isRightButtonDown, setIsRightButtonDown] = useState(false);
	const sizeProperty = toolContext.properties.find(
		(property) => property.name === "size",
	);
	const brushSize =
		typeof sizeProperty?.value === "number"
			? sizeProperty.value
			: Number(sizeProperty?.value ?? 1);
	const cursorSize =
		Math.max(1, Number.isFinite(brushSize) ? brushSize : 1) * canvasView.scale;
	const cursorStyle =
		toolContext.tool === "eyedropper" || isRightButtonDown
			? "crosshair"
			: toolContext.tool === "move"
			? "move"
			: toolContext.tool === "fill"
				? isDesktop
					? "none"
					: "cell"
				: toolContext.tool === "select"
					? "crosshair"
					: "none";
	const updateCursorPosition = (event: PointerEvent<HTMLCanvasElement>) => {
		if (cursorStyle !== "none") return;
		const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
		if (bounds != null) {
			setCursorPosition({
				x: event.clientX - bounds.left,
				y: event.clientY - bounds.top,
			});
		}
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		const viewport = canvas?.parentElement;
		if (
			canvas == null ||
			viewport == null ||
			canvasWidth == null ||
			canvasHeight == null
		) {
			return;
		}

		canvasView.setPosition({
			x: (viewport.clientWidth - canvasWidth) / 2,
			y: (viewport.clientHeight - canvasHeight) / 2,
		});
	}, [canvasWidth, canvasHeight, canvasView.setPosition]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: The WASM renderer reads layer state from shared core state.
	useEffect(() => {
		if (canvasRef.current == null) return;
		canvasRender.render(
			canvasRef.current,
			canvasView.isOnionSkin,
			layerContext.selectedLayerId,
		);
	}, [
		clipContext.clips,
		clipContext.transform,
		layerContext.layers,
		layerContext.selectedLayerId,
		playbackContext.currentFrame,
		canvasView.isOnionSkin,
	]);

	if (
		projectContext.settings == null ||
		canvasWidth == null ||
		canvasHeight == null
	) {
		return;
	}

	const canvasTransform = {
		scale: `${canvasView.scale * (canvasView.isFlippedHorizontal ? -1 : 1)} ${canvasView.scale * (canvasView.isFlippedVertical ? -1 : 1)}`,
		translate: `${canvasView.position.x}px ${canvasView.position.y}px`,
		rotate: `${canvasView.rotation}deg`,
	};
	const flipX = canvasView.isFlippedHorizontal ? -1 : 1;
	const flipY = canvasView.isFlippedVertical ? -1 : 1;
	const angle = (canvasView.rotation * Math.PI) / 180;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const centerX = canvasWidth / 2 + canvasView.position.x;
	const centerY = canvasHeight / 2 + canvasView.position.y;
	const transformedPoint = (x: number, y: number) => {
		const localX = (x - canvasWidth / 2) * canvasView.scale * flipX;
		const localY = (y - canvasHeight / 2) * canvasView.scale * flipY;
		return {
			x: centerX + localX * cos - localY * sin,
			y: centerY + localX * sin + localY * cos,
		};
	};
	const canvasCorners = [
		transformedPoint(0, 0),
		transformedPoint(canvasWidth, 0),
		transformedPoint(canvasWidth, canvasHeight),
		transformedPoint(0, canvasHeight),
	];
	const canvasClipPath = `polygon(${canvasCorners.map(({ x, y }) => `${x}px ${y}px`).join(", ")})`;
	return (
		<div
			className="absolute inset-0"
			onPointerDown={canvasNavigation.handleContainerPointerDown}
			onPointerMove={canvasNavigation.handleContainerPointerMove}
			onPointerUp={canvasNavigation.handleContainerPointerUp}
			onPointerCancel={canvasNavigation.handleContainerPointerCancel}
			onWheel={canvasNavigation.handleWheel}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[url(/transparent.png)]"
				style={{
					clipPath: canvasClipPath,
				}}
			/>
			<canvas
				ref={canvasRef}
				id="draw-canvas"
				width={canvasWidth}
				height={canvasHeight}
				className="absolute inset-0 outline outline-zinc-500/40 [image-rendering:pixelated]"
				style={{ ...canvasTransform, cursor: cursorStyle }}
				onPointerEnter={updateCursorPosition}
				onPointerLeave={() => setCursorPosition(null)}
				onPointerMove={(event) => {
					setIsRightButtonDown((event.buttons & 2) !== 0);
					canvasPointer.handlePointerMove(event);
					updateCursorPosition(event);
				}}
				onPointerDown={(event) => {
					setIsRightButtonDown((event.buttons & 2) !== 0);
					canvasPointer.handlePointerDown(event);
				}}
				onPointerUp={(event) => {
					setIsRightButtonDown(false);
					canvasPointer.handlePointerUp(event);
				}}
				onPointerCancel={(event) => {
					setIsRightButtonDown(false);
					canvasPointer.handlePointerUp(event);
				}}
			/>
			{cursorStyle === "none" &&
				cursorPosition != null &&
				toolContext.tool === "fill" && (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute text-white drop-shadow-[0_0_1px_#111]"
						style={{
							left: cursorPosition.x,
							top: cursorPosition.y,
							transform: "translate(-20%, -80%)",
						}}
					>
						<IconBucketDroplet size={24} stroke={2.25} />
					</div>
				)}
			{cursorStyle === "none" &&
				cursorPosition != null &&
				toolContext.tool !== "fill" && (
					<div
						aria-hidden="true"
						className={`pointer-events-none absolute rounded-full border border-white mix-blend-difference ${toolContext.tool === "eraser" ? "border-dashed" : ""}`}
						style={{
							left: cursorPosition.x,
							top: cursorPosition.y,
							width: cursorSize,
							height: cursorSize,
							transform: "translate(-50%, -50%)",
						}}
					/>
				)}
			<CanvasOverlay
				width={projectContext.settings.width}
				height={projectContext.settings.height}
				transform={canvasTransform}
				selection={canvasPointer.selection}
				isGridVisible={canvasView.isGridVisible}
			/>
		</div>
	);
};

export default DrawCanvas;
