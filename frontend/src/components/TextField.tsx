import { useEffect, useState } from "react";

type Props = Omit<React.ComponentProps<"input">, "className" | "type"> & {
	onValueChange?: (value: string) => void;
};

const TextField = ({
	onValueChange,
	onChange,
	onBlur,
	value,
	...props
}: Props) => {
	const [innerValue, setInnerValue] = useState(
		value?.toString() ?? props.defaultValue?.toString() ?? "",
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
		<input
			{...props}
			type="text"
			value={innerValue}
			onChange={(event) => {
				setInnerValue(event.currentTarget.value);
				onChange?.(event);
			}}
			onBlur={handleBlur}
			className="h-8 rounded-md border border-border bg-surface px-2"
		/>
	);
};

export default TextField;
