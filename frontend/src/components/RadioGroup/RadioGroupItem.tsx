import * as RadioGroupPrimitive from "radix-ui/radio-group";

type Props = React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
	label: string;
};

const RadioGroupItem = ({ id, label, ...props }: Props) => (
	<RadioGroupPrimitive.Item
		{...props}
		className="group grid cursor-pointer grid-cols-[auto_1fr] place-content-center gap-2 rounded-md p-2 hover:not-disabled:bg-clear-hover"
	>
		<div className="flex size-6 items-center justify-center rounded-full border border-border bg-surface group-data-[state=checked]:bg-primary">
			<RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-foreground-primary shadow-md" />
		</div>
		<span className="flex cursor-pointer items-center">{label}</span>
	</RadioGroupPrimitive.Item>
);

export default RadioGroupItem;
