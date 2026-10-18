import * as ToggleGroupPrimitive from "radix-ui/toggle-group";

type Props = React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
	label: string;
};

const ToggleGroupItem = ({ id, label, ...props }: Props) => (
	<ToggleGroupPrimitive.Item
		{...props}
		className="flex flex-1 cursor-pointer items-center justify-center rounded-md px-2 font-medium hover:not-disabled:bg-zinc-500/20 data-[state=on]:bg-primary data-[state=on]:text-white data-[state=on]:hover:not-disabled:bg-primary-hover"
	>
		{label}
	</ToggleGroupPrimitive.Item>
);

export default ToggleGroupItem;
