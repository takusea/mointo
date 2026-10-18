import * as SwitchPrimitive from "@radix-ui/react-switch";

type Props = React.ComponentProps<typeof SwitchPrimitive.Root> & {
	label: string;
};

const Switch = ({ label, ...props }: Props) => (
	<SwitchPrimitive.Root
		{...props}
		className="group grid cursor-pointer grid-cols-[1fr_auto] place-content-center gap-2 rounded-md p-2 hover:not-disabled:bg-zinc-500/20"
	>
		<span className="flex cursor-pointer items-center">{label}</span>
		<div className="relative flex h-6 w-10 cursor-pointer items-center rounded-full border border-zinc-500/40 bg-zinc-500/20 px-1 group-data-[state=checked]:bg-primary">
			<SwitchPrimitive.Thumb className="block size-4 translate-x-0 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-full" />
		</div>
	</SwitchPrimitive.Root>
);
export default Switch;
