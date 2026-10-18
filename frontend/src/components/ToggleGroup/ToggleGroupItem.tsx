import * as ToggleGroupPrimitive from "radix-ui/toggle-group";

type Props = React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
	label: string;
};

const ToggleGroupItem = ({ id, label, ...props }: Props) => (
	<ToggleGroupPrimitive.Item
		{...props}
		className="flex-1 flex items-center justify-center rounded-md hover:not-disabled:bg-zinc-500/20 px-2 cursor-pointer data-[state=on]:text-white data-[state=on]:bg-primary data-[state=on]:hover:not-disabled:bg-primary-hover font-semibold"
	>
		{label}
	</ToggleGroupPrimitive.Item>
);

export default ToggleGroupItem;
