import { IconCheck } from "@tabler/icons-react";
import { Menubar } from "radix-ui";

type Props = React.ComponentProps<typeof Menubar.CheckboxItem> & {
	label: string;
	shortcut?: string;
};

const MenubarCheckboxItem = ({ label, shortcut, ...props }: Props) => {
	return (
		<Menubar.CheckboxItem
			{...props}
			className="relative grid h-8 cursor-pointer grid-cols-[24px_auto_auto] items-center gap-1 rounded-md pr-2 pl-1 hover:not-disabled:bg-clear-hover disabled:cursor-not-allowed disabled:opacity-50 data-highlighted:bg-clear-hover"
		>
			<div className="grid place-content-center">
				<Menubar.ItemIndicator>
					<IconCheck size={16} />
				</Menubar.ItemIndicator>
			</div>
			{label}
			<div className="ml-auto pl-5 opacity-50">{shortcut}</div>
		</Menubar.CheckboxItem>
	);
};

export default MenubarCheckboxItem;
