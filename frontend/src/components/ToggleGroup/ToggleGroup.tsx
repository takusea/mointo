import * as ToggleGroupPrimitive from "radix-ui/toggle-group";

type Props = React.ComponentProps<typeof ToggleGroupPrimitive.Root>;

const ToggleGroup = (props: Props) => (
	<ToggleGroupPrimitive.Root
		className="h-8 flex border border-zinc-500/40 bg-zinc-500/20 rounded-md"
		{...props}
	/>
);

export default ToggleGroup;
