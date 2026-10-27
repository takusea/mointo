import { DropdownMenu } from "radix-ui";

type Props = React.ComponentProps<typeof DropdownMenu.Item> & {
	label: string;
	shortcut?: string;
};

const DropdownMenuItem = ({ label, shortcut, ...props }: Props) => {
	return (
		<DropdownMenu.Item
			{...props}
			className="relative grid h-8 cursor-pointer grid-cols-[24px_auto_auto] items-center gap-1 rounded-md pr-2 pl-1 hover:not-data-disabled:bg-clear-hover data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-clear-hover"
		>
			<div />
			{label}
			<div className="ml-auto pl-5 opacity-50">{shortcut}</div>
		</DropdownMenu.Item>
	);
};

export default DropdownMenuItem;
