import * as SwitchPrimitive from "@radix-ui/react-switch";

type Props = React.ComponentProps<typeof SwitchPrimitive.Root> & {
	label: string;
};

const Switch = ({ label, ...props }: Props) => (
	<SwitchPrimitive.Root
		{...props}
		className="group grid cursor-pointer grid-cols-[1fr_auto] place-content-center gap-2 rounded-md p-2 hover:not-disabled:bg-clear-hover"
	>
		<span className="flex cursor-pointer items-center">{label}</span>
		<div className="relative flex h-6 w-10 cursor-pointer items-center rounded-full border border-border bg-surface px-1 group-data-[state=checked]:bg-primary">
			<SwitchPrimitive.Thumb className="-m-px block size-4 translate-x-0 rounded-full bg-white shadow-md ring-1 ring-border transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-full" />
		</div>
	</SwitchPrimitive.Root>
);
export default Switch;
