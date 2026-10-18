import * as ToggleGroupPrimitive from "radix-ui/toggle-group";

type Props = React.ComponentProps<typeof ToggleGroupPrimitive.Root>;

const ToggleGroup = (props: Props) => (
	<ToggleGroupPrimitive.Root
		{...props}
		className="flex h-8 rounded-md border border-zinc-500/40 bg-zinc-500/20"
	/>
);

export default ToggleGroup;
