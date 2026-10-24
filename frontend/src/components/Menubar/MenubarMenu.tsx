import { Menubar } from "radix-ui";

type Props = React.ComponentProps<typeof Menubar.Menu> & {
	label: string;
};

const MenubarMenu = ({ label, children, ...props }: Props) => {
	return (
		<Menubar.Menu {...props}>
			<Menubar.Trigger className="group h-12 cursor-pointer outline-none disabled:cursor-not-allowed disabled:opacity-50">
				<div className="flex h-8 items-center justify-between rounded-md px-2 font-medium text-nowrap group-focus-within:outline-2 group-hover:not-disabled:bg-clear-hover group-data-[state=open]:bg-clear-hover">
					{label}
				</div>
			</Menubar.Trigger>
			<Menubar.Portal>
				<Menubar.Content
					className="z-50 min-w-55 rounded-xl border border-border bg-background p-2 shadow-lg backdrop-blur-xl"
					align="start"
					alignOffset={-8}
				>
					{children}
				</Menubar.Content>
			</Menubar.Portal>
		</Menubar.Menu>
	);
};

export default MenubarMenu;
