import * as TooltipPrimitive from "@radix-ui/react-tooltip";

type Props = React.ComponentProps<typeof TooltipPrimitive.Root> & {
	label: string;
	shortcut?: string;
	side?: "top" | "right" | "bottom" | "left";
};

const Tooltip = ({ label, shortcut, side, children, ...props }: Props) => {
	return (
		<TooltipPrimitive.Root {...props}>
			<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content
					className="z-50 select-none rounded-md border border-border bg-background p-2 leading-none shadow-md backdrop-blur-xl"
					side={side}
				>
					<span className="flex items-center gap-2">
						<span>{label}</span>
						{shortcut && <span className="opacity-50">{shortcut}</span>}
					</span>
					<TooltipPrimitive.Arrow className="-mt-px border-border fill-background drop-shadow-[0_1px_0] drop-shadow-border" />
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
};

export default Tooltip;
