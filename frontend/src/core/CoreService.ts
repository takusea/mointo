import type { ProjectSettings } from "~/features/project/type";
import type { ClipMetadata, ClipProperties } from "~/lib/clip";
import type { LayerId, LayerState } from "~/lib/layer";
import type { Transform } from "~/lib/transform";
import init, { FlippenCore } from "./wasm/flippen_wasm";

type WasmOperation<T> = (core: FlippenCore) => T | PromiseLike<T>;

export type ToolPoint = {
	x: number;
	y: number;
	pressure: number;
};

export type ToolProperty = {
	name: string;
	label: string;
	value: unknown;
	min: number;
	max: number;
	step: number;
	unit?: string;
};

export type CoreSnapshot = {
	clips: ClipMetadata[];
	clipTransforms: Record<string, Transform>;
	layers: LayerState[];
	projectSettings: ProjectSettings | undefined;
	canUndo: boolean;
	canRedo: boolean;
	revision: number;
};

export class CoreService {
	private static wasmInitialization: ReturnType<typeof init> | undefined;

	private constructor(private readonly core: FlippenCore) {}

	private readonly listeners = new Set<() => void>();
	private operationQueue: Promise<void> = Promise.resolve();
	private revision = 0;
	private snapshot: CoreSnapshot = {
		clips: [],
		clipTransforms: {},
		layers: [],
		projectSettings: undefined,
		canUndo: false,
		canRedo: false,
		revision: 0,
	};

	static async create() {
		if (CoreService.wasmInitialization == null) {
			CoreService.wasmInitialization = init().catch((error: unknown) => {
				CoreService.wasmInitialization = undefined;
				throw error;
			});
		}
		await CoreService.wasmInitialization;
		return new CoreService(new FlippenCore());
	}

	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	private notify() {
		const settings = this.readProjectSettings();
		const clips = (this.core.get_clips() as ClipMetadata[] | undefined) ?? [];
		const layers = (this.core.get_layers() as LayerState[] | undefined) ?? [];
		this.revision += 1;
		this.snapshot = {
			clips,
			clipTransforms: Object.fromEntries(
				clips.flatMap((clip) => {
					const transform = this.core.get_clip_transform(clip.id);
					return transform === undefined
						? []
						: [[clip.id, transform as Transform] as const];
				}),
			),
			layers,
			projectSettings: settings,
			canUndo: this.core.can_undo(),
			canRedo: this.core.can_redo(),
			revision: this.revision,
		};
		for (const listener of this.listeners) listener();
	}

	getSnapshot = (): CoreSnapshot => this.snapshot;

	private enqueue<T>(operation: WasmOperation<T>, notify = false): Promise<T> {
		const result = this.operationQueue.then(async () => {
			const value = await operation(this.core);
			if (notify) this.notify();
			return value;
		});
		this.operationQueue = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	private readProjectSettings(): ProjectSettings | undefined {
		if (this.core.width() == null) return;
		const settings = this.core.get_project_settings() as {
			title: string;
			width: number;
			height: number;
			frame_rate: number;
			start_frame: number;
			end_frame: number;
		};
		return {
			title: settings.title,
			width: settings.width,
			height: settings.height,
			frameRate: settings.frame_rate,
			startFrame: settings.start_frame,
			endFrame: settings.end_frame,
		};
	}

	createProject(settings: ProjectSettings) {
		return this.enqueue(
			(core) =>
				core.create_project({
					title: settings.title,
					width: settings.width,
					height: settings.height,
					frame_rate: settings.frameRate,
					start_frame: settings.startFrame,
					end_frame: settings.endFrame,
				}),
			true,
		);
	}

	setProjectSettings(settings: ProjectSettings) {
		return this.enqueue(
			(core) =>
				core.set_project_settings({
					title: settings.title,
					width: settings.width,
					height: settings.height,
					frame_rate: settings.frameRate,
					start_frame: settings.startFrame,
					end_frame: settings.endFrame,
				}),
			true,
		);
	}

	importProject(data: Uint8Array) {
		return this.enqueue((core) => core.import(data), true);
	}

	getProjectSettings() {
		return this.enqueue((core) => {
			if (core.width() == null) return;
			const settings = core.get_project_settings() as {
				title: string;
				width: number;
				height: number;
				frame_rate: number;
				start_frame: number;
				end_frame: number;
			};
			return {
				title: settings.title,
				width: settings.width,
				height: settings.height,
				frameRate: settings.frame_rate,
				startFrame: settings.start_frame,
				endFrame: settings.end_frame,
			};
		});
	}

	exportProject() {
		return this.enqueue((core) => core.export());
	}

	getClips() {
		return this.enqueue(
			(core) => (core.get_clips() as ClipMetadata[] | undefined) ?? [],
		);
	}

	addClip(start: number, layerId: LayerId) {
		return this.enqueue((core) => {
			core.add_clip(start, layerId);
			return (core.get_clips() as ClipMetadata[] | undefined) ?? [];
		}, true);
	}

	addClipWithSize(
		start: number,
		layerId: LayerId,
		width: number,
		height: number,
	) {
		return this.enqueue((core) => {
			core.add_clip_with_size(start, layerId, width, height);
			return (core.get_clips() as ClipMetadata[] | undefined) ?? [];
		}, true);
	}

	deleteClip(id: string) {
		return this.enqueue((core) => core.delete_clip(id), true);
	}

	getClipPixels(id: string) {
		return this.enqueue((core) => core.get_clip_pixels(id));
	}

	replaceClipPixels(id: string, pixels: Uint8ClampedArray) {
		return this.enqueue(
			(core) => core.replace_clip_pixels(id, new Uint8Array(pixels)),
			true,
		);
	}

	moveClip(id: string, start: number, layerId: LayerId) {
		return this.enqueue((core) => core.move_clip(id, start, layerId), true);
	}

	changeClipDuration(id: string, duration: number) {
		return this.enqueue(
			(core) => core.change_clip_duration(id, duration),
			true,
		);
	}

	changeClipSize(id: string, width: number, height: number) {
		return this.enqueue((core) => core.set_clip_size(id, width, height), true);
	}

	changeClipName(id: string, name: string) {
		return this.enqueue((core) => core.set_clip_name(id, name), true);
	}

	changeClipProperties(id: string, properties: ClipProperties) {
		return this.enqueue(
			(core) =>
				core.set_clip_properties(id, {
					hidden: properties.hidden,
					alpha_locked: properties.alpha_locked,
					locked: properties.locked,
					opacity: properties.opacity,
					blend_mode: properties.blend_mode,
				}),
			true,
		);
	}

	showLayer(layerId: LayerId) {
		return this.enqueue((core) => core.show_layer(layerId), true);
	}

	hideLayer(layerId: LayerId) {
		return this.enqueue((core) => core.hide_layer(layerId), true);
	}

	unlockLayer(layerId: LayerId) {
		return this.enqueue((core) => core.unlock_layer(layerId), true);
	}

	lockLayer(layerId: LayerId) {
		return this.enqueue((core) => core.lock_layer(layerId), true);
	}

	undo() {
		return this.enqueue((core) => core.undo(), true);
	}

	redo() {
		return this.enqueue((core) => core.redo(), true);
	}

	canUndo() {
		return this.enqueue((core) => core.can_undo());
	}

	canRedo() {
		return this.enqueue((core) => core.can_redo());
	}

	beginDraw(clipId: string) {
		return this.enqueue((core) => core.begin_draw(clipId), true);
	}

	applyToolPoints(
		clipId: string,
		tool: string,
		points: ToolPoint[],
		color: Uint8Array,
	) {
		return this.enqueue((core) => {
			if (points.length === 0) return;

			const packedPoints = new Float64Array(points.length * 3);
			for (let index = 0; index < points.length; index++) {
				const point = points[index];
				const offset = index * 3;
				packedPoints[offset] = point.x;
				packedPoints[offset + 1] = point.y;
				packedPoints[offset + 2] = point.pressure;
			}

			core.apply_tool_points(clipId, tool, packedPoints, color);
		});
	}

	endDraw() {
		return this.enqueue((core) => core.end_draw(), true);
	}

	cancelDraw() {
		return this.enqueue((core) => core.cancel_draw(), true);
	}

	beginActionGroup() {
		return this.enqueue((core) => core.begin_action_group());
	}

	endActionGroup() {
		return this.enqueue((core) => core.end_action_group(), true);
	}

	getToolProperties(tool: string) {
		return this.enqueue((core) => {
			const properties = core.get_tool_properties(tool);
			if (properties === undefined) return;
			return properties as ToolProperty[];
		});
	}

	setToolProperty(tool: string, key: string, value: unknown) {
		return this.enqueue(
			(core) => core.set_tool_property(tool, key, value),
			true,
		);
	}

	updateClipTransform(id: string, transform: Transform) {
		return this.enqueue((core) => {
			core.set_clip_transform(id, {
				position: transform.position,
				scale: transform.scale,
				rotation: transform.rotation,
				anchor: transform.anchor,
			});
		}, true);
	}

	renderFrame(frame: number) {
		return this.enqueue((core) => core.render_frame(frame));
	}

	renderFrameToCanvas(
		frame: number,
		canvas: HTMLCanvasElement,
		onionLayerId?: LayerId | null,
	) {
		return this.enqueue((core) =>
			onionLayerId == null
				? core.render_frame_to_canvas(frame, canvas)
				: core.render_frame_to_canvas_with_onion(frame, canvas, onionLayerId),
		);
	}

	runOperation<T>(operation: WasmOperation<T>, notify = false) {
		return this.enqueue(operation, notify);
	}
}
