import { IconChevronRight } from "@tabler/icons-react";
import { Menubar } from "radix-ui";

type Props = React.ComponentProps<typeof Menubar.Sub> & {
	label: string;
};

const MenubarSub = ({ label, children, ...props }: Props) => {
	return (
		<Menubar.Sub {...props}>
			<Menubar.SubTrigger
				{...props}
				className="relative grid h-8 cursor-pointer grid-cols-[24px_1fr_auto] items-center gap-1 rounded-md pr-2 pl-1 hover:not-data-disabled:bg-clear-hover data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-clear-hover"
			>
				<div />
				{label}
				<IconChevronRight />
			</Menubar.SubTrigger>
			<Menubar.Portal>
				<Menubar.SubContent
					className="z-50 min-w-55 rounded-xl border border-border bg-background p-2 shadow-lg backdrop-blur-xl"
					align="start"
					alignOffset={-8}
				>
					{children}
				</Menubar.SubContent>
			</Menubar.Portal>
		</Menubar.Sub>
	);
};

export default MenubarSub;
