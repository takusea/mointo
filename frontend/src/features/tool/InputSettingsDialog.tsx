import { useState } from "react";
import Dialog from "~/components/Dialog";
import Slider from "~/components/Slider";
import Switch from "~/components/Switch";
import { useI18n } from "~/features/i18n/useI18n";
import { getPressureCurvePath } from "./pressureCurve";
import { useTool } from "./useTool";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const CURVE_VIEWBOX = 240;

const InputSettingsDialog = (props: Props) => {
	const { t } = useI18n();
	const tool = useTool();
	const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
	const pointRemovalMargin = 0.12;

	const updatePoint = (event: React.PointerEvent<SVGSVGElement>) => {
		if (draggingPoint == null) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const rawX = (event.clientX - rect.left) / rect.width;
		const rawY = (event.clientY - rect.top) / rect.height;
		if (
			(rawX < -pointRemovalMargin ||
				rawX > 1 + pointRemovalMargin ||
				rawY < -pointRemovalMargin ||
				rawY > 1 + pointRemovalMargin) &&
			draggingPoint > 0 &&
			draggingPoint < tool.pressureCurve.length - 1
		) {
			tool.setPressureCurve(
				tool.pressureCurve.filter((_, index) => index !== draggingPoint),
			);
			setDraggingPoint(null);
			return;
		}

		const curve = tool.pressureCurve.map((point) => [...point]) as [
			number,
			number,
		][];
		const x =
			draggingPoint === 0
				? 0
				: draggingPoint === curve.length - 1
					? 1
					: Math.max(
							curve[draggingPoint - 1][0] + 0.01,
							Math.min(curve[draggingPoint + 1][0] - 0.01, rawX),
						);
		const y = 1 - Math.max(0, Math.min(1, rawY));
		curve[draggingPoint] = [x, y];
		tool.setPressureCurve(curve);
	};

	const addPoint = (event: React.PointerEvent<SVGSVGElement>) => {
		if ((event.target as Element).tagName === "circle") return;
		const rect = event.currentTarget.getBoundingClientRect();
		const x = Math.max(
			0,
			Math.min(1, (event.clientX - rect.left) / rect.width),
		);
		const y =
			1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
		const curve = [...tool.pressureCurve];
		const next = curve.findIndex(([pointX]) => pointX >= x);
		if (
			next <= 0 ||
			Math.abs(curve[next][0] - x) < 0.01 ||
			Math.abs(curve[next - 1][0] - x) < 0.01
		) {
			return;
		}
		curve.splice(next, 0, [x, y]);
		tool.setPressureCurve(curve);
		setDraggingPoint(next);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	return (
		<Dialog
			{...props}
			title={t("inputSettings.title")}
			cancelText={t("common.close")}
		>
			<div className="flex flex-col gap-2">
				<div className="flex justify-between gap-1">
					<span className="font-medium">
						{t("inputSettings.stabilization")}
					</span>
					<span>{`${String(tool.stabilization)}%`}</span>
				</div>
				<p>{t("inputSettings.stabilizationHint")}</p>
				<Slider
					id="inputStabilization"
					min={0}
					max={100}
					step={1}
					value={[tool.stabilization]}
					onValueChange={([value]) => tool.setStabilization(value)}
					aria-label={t("inputSettings.stabilizationLabel")}
				/>
				<div className="font-medium">{t("inputSettings.pressure")}</div>
				<Switch
					id="inputPressure"
					label={t("inputSettings.pressureLabel")}
					checked={tool.pressureEnabled}
					onCheckedChange={tool.setPressureEnabled}
				/>
				{tool.pressureEnabled && (
					<>
						<p className="font-medium">{t("inputSettings.pressureCurve")}</p>
						<p>{t("inputSettings.curveHint")}</p>
						<svg
							viewBox={`0 0 ${CURVE_VIEWBOX} ${CURVE_VIEWBOX}`}
							role="img"
							aria-label={t("inputSettings.pressureCurve")}
							className="aspect-square w-full touch-none rounded-md border border-zinc-500/40 bg-white/10"
							onPointerDown={addPoint}
							onPointerMove={updatePoint}
							onPointerUp={() => setDraggingPoint(null)}
							onPointerCancel={() => setDraggingPoint(null)}
						>
							<path
								d={`M 0 ${CURVE_VIEWBOX} L ${CURVE_VIEWBOX} 0`}
								fill="none"
								stroke="currentColor"
								strokeOpacity=".25"
								strokeDasharray="2 2"
							/>
							<path
								d={getPressureCurvePath(tool.pressureCurve, CURVE_VIEWBOX)}
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							{tool.pressureCurve.map(([x, y], index) => (
								<circle
									key={x}
									cx={x * CURVE_VIEWBOX}
									cy={(1 - y) * CURVE_VIEWBOX}
									r="3"
									className={`${index === 0 || index === tool.pressureCurve.length - 1 ? "fill-zinc-400" : "fill-primary"} stroke-white`}
									strokeWidth="1"
									style={{ touchAction: "none", cursor: "grab" }}
									onPointerDown={(pointerEvent) => {
										pointerEvent.stopPropagation();
										pointerEvent.currentTarget.ownerSVGElement?.setPointerCapture(
											pointerEvent.pointerId,
										);
										setDraggingPoint(index);
									}}
								/>
							))}
						</svg>
					</>
				)}
			</div>
		</Dialog>
	);
};

export default InputSettingsDialog;
