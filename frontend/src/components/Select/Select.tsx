import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import * as SelectPrimitive from "radix-ui/select";

type Props = React.ComponentProps<typeof SelectPrimitive.Root> & {
	id?: string;
	label?: string;
	placeholder?: string;
};

const Select = ({ children, placeholder, ...props }: Props) => {
	return (
		<SelectPrimitive.Root {...props}>
			<SelectPrimitive.Trigger
				className="flex h-8 not-disabled:cursor-pointer items-center justify-between gap-1 rounded-md border border-zinc-500/40 bg-white/50 px-2 hover:not-disabled:bg-zinc-200/50 disabled:opacity-50 dark:bg-zinc-800/50 dark:hover:not-disabled:bg-zinc-700/50"
				aria-label={props.label}
				id={props.id}
			>
				<SelectPrimitive.Value placeholder={placeholder} />
				<SelectPrimitive.Icon className="SelectIcon">
					<IconChevronDown />
				</SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>
			<SelectPrimitive.Portal>
				<SelectPrimitive.Content
					position="popper"
					sideOffset={5}
					className="z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-zinc-500/40 bg-white/90 p-2 shadow-lg backdrop-blur-xl dark:bg-zinc-950/90"
				>
					<SelectPrimitive.ScrollUpButton className="flex h-6 cursor-default items-center justify-center">
						<IconChevronUp />
					</SelectPrimitive.ScrollUpButton>
					<SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
					<SelectPrimitive.ScrollDownButton className="flex h-6 cursor-default items-center justify-center">
						<IconChevronDown />
					</SelectPrimitive.ScrollDownButton>
				</SelectPrimitive.Content>
			</SelectPrimitive.Portal>
		</SelectPrimitive.Root>
	);
};

export default Select;
