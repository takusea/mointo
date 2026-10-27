import type { TablerIcon } from "@tabler/icons-react";
import Tooltip from "./Tooltip";

type Size = "small" | "medium" | "large";
type Variant = "default" | "primary";

type Props = Omit<React.ComponentProps<"button">, "className" | "type"> & {
	label: string;
	icon: TablerIcon;
	variant?: Variant;
	toolTipSide?: "top" | "right" | "bottom" | "left";
	shortcut?: string;
	size?: Size;
};

const IconButton = ({
	label,
	icon: Icon,
	variant = "default",
	size = "medium",
	toolTipSide,
	shortcut,
	...props
}: Props) => {
	return (
		<Tooltip label={label} shortcut={shortcut} side={toolTipSide ?? "top"}>
			<button
				{...props}
				type="button"
				data-variant={variant}
				data-size={size}
				className="flex cursor-pointer items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-50 data-[size=large]:p-2 data-[size=medium]:p-1 data-[variant=default]:hover:not-disabled:bg-clear-hover data-[variant=primary]:bg-primary data-[variant=primary]:text-foreground-primary data-[variant=primary]:hover:not-disabled:bg-primary"
				aria-label={label}
			>
				<Icon size={size === "small" ? 16 : 24} />
			</button>
		</Tooltip>
	);
};

export default IconButton;
