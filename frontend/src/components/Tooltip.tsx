import * as TooltipPrimitive from "@radix-ui/react-tooltip";

type Props = React.ComponentProps<typeof TooltipPrimitive.Root> & {
	label: string;
	shortcut?: string;
	side: "top" | "right" | "bottom" | "left";
};

const Tooltip = ({ label, shortcut, side, children, ...props }: Props) => {
	return (
		<TooltipPrimitive.Root {...props}>
			<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content
					className="z-50 select-none rounded-md border border-zinc-500/40 bg-white/90 p-2 leading-none shadow-md backdrop-blur-xl dark:bg-zinc-950/90"
					side={side}
				>
					<span className="flex items-center gap-2">
						<span>{label}</span>
						{shortcut && <span className="opacity-50">{shortcut}</span>}
					</span>
					<TooltipPrimitive.Arrow className="-mt-px border-zinc-500/40 fill-white/90 drop-shadow-[0_1px_0] drop-shadow-zinc-500 dark:fill-zinc-950/90" />
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
};

export default Tooltip;
