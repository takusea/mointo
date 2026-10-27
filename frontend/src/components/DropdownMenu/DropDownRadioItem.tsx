import { DropdownMenu } from "radix-ui";

type Props = React.ComponentProps<typeof DropdownMenu.RadioItem> & {
	label: string;
};

const DropdownMenuRadioItem = ({ label, ...props }: Props) => {
	return (
		<DropdownMenu.RadioItem
			{...props}
			className="relative grid h-8 cursor-pointer grid-cols-[24px_auto_auto] items-center gap-1 rounded-md pr-2 pl-1 hover:not-data-disabled:bg-clear-hover data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-clear-hover"
		>
			<div className="grid place-content-center">
				<DropdownMenu.ItemIndicator className="size-2 rounded-full bg-foreground" />
			</div>
			{label}
		</DropdownMenu.RadioItem>
	);
};

export default DropdownMenuRadioItem;
