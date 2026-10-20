import * as ToggleGroupPrimitive from "radix-ui/toggle-group";

type Props = React.ComponentProps<typeof ToggleGroupPrimitive.Root>;

const ToggleGroup = (props: Props) => (
	<ToggleGroupPrimitive.Root
		{...props}
		className="flex h-8 rounded-md border border-border bg-surface p-px"
	/>
);

export default ToggleGroup;
