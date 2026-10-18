import type React from "react";
import { type JSX, useEffect, useRef, useState } from "react";
import Tooltip from "~/components/Tooltip";

type Props = Omit<React.ComponentProps<"input">, "className" | "type"> & {
	leftElement?: string | JSX.Element;
	rightElement?: string | JSX.Element;
	onValueChange?: (value: number) => void;
	onInteractionStart?: () => void;
	onInteractionEnd?: () => void;
};

const NumberField = ({
	leftElement,
	rightElement,
	onValueChange,
	onBlur,
	onInteractionStart,
	onInteractionEnd,
	...props
}: Props) => {
	const input = useRef<HTMLInputElement>(null);
	const dragValue = useRef<number | null>(null);
	const lastCommittedValue = useRef<number | null>(null);
	const interactionStarted = useRef(false);

	const [isMoved, setIsMoved] = useState<boolean>(false);
	const [innerValue, setInnerValue] = useState<string>("");

	useEffect(() => {
		setInnerValue(
			props.value?.toString() ?? props.defaultValue?.toString() ?? "",
		);
	}, [props.value, props.defaultValue]);

	const min = Number(props.min ?? Number.MIN_SAFE_INTEGER);
	const max = Number(props.max ?? Number.MAX_SAFE_INTEGER);
	const step = Number(props.step ?? 1);
	const clamp = (value: number) => {
		return Math.max(min, Math.min(Math.round(value / step) * step, max));
	};

	const cursor = isMoved ? "cursor-ew-resize" : "cursor-text";

	const finishInteraction = () => {
		dragValue.current = null;
		if (interactionStarted.current) {
			interactionStarted.current = false;
			onInteractionEnd?.();
		}
	};

	const handlePointerDown = (event: React.PointerEvent) => {
		if (props.disabled || event.button !== 0 || event.pointerType === "touch") {
			return;
		}

		event.currentTarget.setPointerCapture(event.pointerId);

		interactionStarted.current = true;
		onInteractionStart?.();
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		if (
			props.disabled ||
			document.activeElement === input.current ||
			!(event.buttons & 1) ||
			props.value == null ||
			event.pointerType === "touch"
		)
			return;

		if (Math.abs(event.movementX) > 0) {
			setIsMoved(true);
		}

		const currentValue = dragValue.current ?? Number(props.value);
		const nextValue = clamp(currentValue + event.movementX * step);
		dragValue.current = nextValue;
		onValueChange?.(nextValue);
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		if (event.pointerType === "touch") return;
		finishInteraction();
		if (props.disabled) {
			setIsMoved(false);
			return;
		}

		if (!isMoved) {
			if (input.current == null) {
				throw new Error("input.current is null");
			}
			input.current.focus();
		}
		setIsMoved(false);
	};

	const handleChange = (event: React.ChangeEvent) => {
		if (props.disabled) return;
		if (!(event.currentTarget instanceof HTMLInputElement)) {
			throw new Error("event.currentTarget is not instanceof HTMLInputElement");
		}

		setInnerValue(event.currentTarget.value);
		lastCommittedValue.current = null;
	};

	const commitValue = (target: HTMLInputElement) => {
		if (props.disabled) return;

		const value = target.valueAsNumber;
		if (!Number.isFinite(value) || value === lastCommittedValue.current) return;

		const nextValue = clamp(value);
		lastCommittedValue.current = nextValue;
		onValueChange?.(nextValue);
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter") {
			if (!(event.currentTarget instanceof HTMLInputElement)) {
				throw new Error(
					"event.currentTarget is not instanceof HTMLInputElement",
				);
			}

			commitValue(event.currentTarget);
		}
	};

	const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
		commitValue(event.currentTarget);
		onBlur?.(event);
	};

	return (
		<div
			className={`flex h-8 gap-1 rounded-md border border-zinc-500/40 bg-white/50 pr-2 pl-1 -outline-offset-2 focus-within:outline-2 dark:bg-zinc-800/50 ${props.disabled ? "opacity-50" : cursor}`}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={() => {
				finishInteraction();
				setIsMoved(false);
			}}
		>
			{leftElement && (
				<div className="flex h-full items-center text-zinc-500">
					{props["aria-label"] ? (
						<Tooltip label={props["aria-label"]} side="top">
							<span className="flex h-full items-center">{leftElement}</span>
						</Tooltip>
					) : (
						leftElement
					)}
				</div>
			)}
			<input
				{...props}
				ref={input}
				type="number"
				value={innerValue}
				className="h-full min-w-0 flex-1 text-right outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
			/>
			{rightElement && (
				<div className="flex h-full items-center text-zinc-500">
					{rightElement}
				</div>
			)}
		</div>
	);
};

export default NumberField;
