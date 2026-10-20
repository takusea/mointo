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

const padding = (size: Size) => {
	switch (size) {
		case "small":
			return "";
		case "medium":
			return "p-1";
		case "large":
			return "p-2";
	}
};

const color = (variant: Variant) => {
	switch (variant) {
		case "default":
			return "hover:not-disabled:bg-clear-hover";
		case "primary":
			return "text-foreground-primary bg-primary hover:not-disabled:bg-primary";
	}
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
				className={`flex cursor-pointer items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-50 ${padding(size)} ${color(variant)}`}
				aria-label={label}
			>
				<Icon />
			</button>
		</Tooltip>
	);
};

export default IconButton;
