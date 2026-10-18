import { Menubar } from "radix-ui";

type Props = React.ComponentProps<typeof Menubar.Item> & {
	label: string;
	shortcut?: string;
};

const MenubarItem = ({ label, shortcut, ...props }: Props) => {
	return (
		<Menubar.Item
			{...props}
			className="relative grid h-8 cursor-pointer grid-cols-[24px_auto_auto] items-center gap-1 rounded-md pr-2 pl-1 hover:not-data-disabled:bg-zinc-500/20 data-disabled:cursor-not-allowed data-highlighted:bg-zinc-500/20 data-disabled:opacity-50"
		>
			<div />
			{label}
			<div className="ml-auto pl-5 opacity-50">{shortcut}</div>
		</Menubar.Item>
	);
};

export default MenubarItem;
