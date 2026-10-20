import type { TablerIcon } from "@tabler/icons-react";

type Size = "small" | "medium" | "large";
type Variant = "default" | "primary";

type Props = Omit<React.ComponentProps<"button">, "className" | "type"> & {
	label: string;
	icon?: TablerIcon;
	variant?: Variant;
	size?: Size;
};

const padding = (size: Size) => {
	switch (size) {
		case "small":
			return "h-6 px-1";
		case "medium":
			return "h-8 px-2";
		case "large":
			return "h-12 px-3";
	}
};

const color = (variant: Variant) => {
	switch (variant) {
		case "default":
			return "hover:not-disabled:bg-clear-hover";
		case "primary":
			return "text-foreground-primary bg-primary hover:not-disabled:bg-primary-hover";
	}
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
			className={`grid cursor-pointer grid-cols-[auto_auto] items-center justify-center text-nowrap rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50 ${padding(size)} ${color(variant)}`}
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
