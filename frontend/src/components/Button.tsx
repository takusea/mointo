import type { TablerIcon } from "@tabler/icons-react";

type Size = "small" | "medium" | "large";
type Variant = "default" | "primary";

type Props = Omit<React.ComponentProps<"button">, "className" | "type"> & {
	label: string;
	icon?: TablerIcon;
	variant?: Variant;
	size?: Size;
};

const Button = ({
	label,
	icon: Icon,
	variant = "default",
	size = "medium",
	...props
}: Props) => {
	return (
		<button
			{...props}
			type="button"
			data-variant={variant}
			data-size={size}
			className="grid cursor-pointer grid-cols-[auto_auto] items-center justify-center rounded-md font-medium text-nowrap disabled:cursor-not-allowed disabled:opacity-50 data-[size=large]:h-12 data-[size=large]:px-3 data-[size=medium]:h-8 data-[size=medium]:px-2 data-[variant=default]:hover:not-disabled:bg-clear-hover data-[variant=primary]:bg-primary data-[variant=primary]:text-foreground-primary data-[variant=primary]:hover:not-disabled:bg-primary-hover"
		>
			{Icon && (
				<div className="mr-1">
					<Icon />
				</div>
			)}
			<div className="overflow-hidden text-ellipsis">{label}</div>
		</button>
	);
};

export default Button;
