import { type JSX, useEffect, useState } from "react";
import Tooltip from "./Tooltip";

type Props = Omit<React.ComponentProps<"input">, "className" | "type"> & {
	leftElement?: JSX.Element | string;
	rightElement?: JSX.Element | string;
	onValueChange?: (value: string) => void;
};

const TextField = ({
	leftElement,
	rightElement,
	onValueChange,
	onChange,
	onBlur,
	value,
	defaultValue,
	...props
}: Props) => {
	const [innerValue, setInnerValue] = useState(
		value?.toString() ?? defaultValue?.toString() ?? "",
	);

	useEffect(() => {
		if (value != null) setInnerValue(value.toString());
	}, [value]);

	const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
		onValueChange?.(event.currentTarget.value);
		onBlur?.(event);
		setInnerValue(event.currentTarget.value);
	};

	return (
		<div className="flex h-8 min-w-0 touch-none items-center gap-1 rounded-md border border-border bg-surface px-2 -outline-offset-2 not-[aria-disabled]:cursor-text focus-within:outline-2 aria-disabled:opacity-50">
			{leftElement && (
				<div className="flex h-full items-center text-foreground-muted">
					{props["aria-label"] ? (
						<Tooltip label={props["aria-label"]} side="top">
							{leftElement}
						</Tooltip>
					) : (
						leftElement
					)}
				</div>
			)}
			<input
				{...props}
				type="text"
				value={innerValue}
				onChange={(event) => {
					setInnerValue(event.currentTarget.value);
					onChange?.(event);
				}}
				onBlur={handleBlur}
				className="h-full flex-1 outline-none"
			/>
			{rightElement && (
				<div className="flex h-full items-center text-foreground-muted">
					{rightElement}
				</div>
			)}
		</div>
	);
};

export default TextField;
