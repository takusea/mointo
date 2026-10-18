import * as SwitchPrimitive from "@radix-ui/react-switch";

type Props = React.ComponentProps<typeof SwitchPrimitive.Root> & {
	label: string;
};

const Switch = ({ label, ...props }: Props) => (
	<SwitchPrimitive.Root
		{...props}
		className="group grid gap-2 grid-cols-[1fr_auto] place-content-center rounded-md hover:not-disabled:bg-zinc-500/20 p-2 cursor-pointer"
	>
		<span className="flex items-center cursor-pointer">{label}</span>
		<div className="relative flex items-center px-1 h-6 w-10 rounded-full border border-zinc-500/40 bg-zinc-500/20 group-data-[state=checked]:bg-primary cursor-pointer">
			<SwitchPrimitive.Thumb className="block size-4 translate-x-0 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-full" />
		</div>
	</SwitchPrimitive.Root>
);
export default Switch;
