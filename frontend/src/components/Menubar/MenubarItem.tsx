import { Menubar } from "radix-ui";

type Props = React.ComponentProps<typeof Menubar.Item> & {
	label: string;
	shortcut?: string;
};

const MenubarItem = ({ label, shortcut, ...props }: Props) => {
	return (
		<Menubar.Item
			{...props}
			className="relative grid grid-cols-[24px_auto_auto] gap-1 pl-1 pr-2 h-8 items-center rounded-md cursor-pointer hover:not-data-disabled:bg-zinc-500/20 data-highlighted:bg-zinc-500/20 data-disabled:opacity-50 data-disabled:cursor-not-allowed"
		>
			<div />
			{label}
			<div className="ml-auto pl-5 opacity-50">{shortcut}</div>
		</Menubar.Item>
	);
};

export default MenubarItem;
