import * as RadioGroupPrimitive from "radix-ui/radio-group";

type Props = React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
	label: string;
};

const RadioGroupItem = ({ id, label, ...props }: Props) => (
	<RadioGroupPrimitive.Item
		{...props}
		className="group grid gap-2 grid-cols-[auto_1fr] place-content-center rounded-md hover:not-disabled:bg-zinc-500/20 p-2 cursor-pointer"
	>
		<div className="size-6 rounded-full border border-zinc-500/40 bg-zinc-500/25 flex items-center justify-center group-data-[state=checked]:bg-primary">
			<RadioGroupPrimitive.Indicator className="bg-white size-2 rounded-full" />
		</div>
		<span className="flex items-center cursor-pointer">{label}</span>
	</RadioGroupPrimitive.Item>
);

export default RadioGroupItem;
