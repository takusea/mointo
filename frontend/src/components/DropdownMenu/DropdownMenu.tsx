import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { type JSX, useState } from "react";

type Props = React.ComponentProps<typeof DropdownMenuPrimitive.Root> & {
	menu: JSX.Element;
	side?: "top" | "right" | "bottom" | "left";
};

const DropdownMenu = ({ menu, side, children, ...props }: Props) => {
	const [isOpen, setOpen] = useState(false);

	return (
		<DropdownMenuPrimitive.Root {...props} open={isOpen} onOpenChange={setOpen}>
			<DropdownMenuPrimitive.Trigger asChild>
				{children}
			</DropdownMenuPrimitive.Trigger>
			<DropdownMenuPrimitive.Portal>
				<DropdownMenuPrimitive.Content
					className="z-50 rounded-xl border border-border bg-background p-2 leading-none shadow-md backdrop-blur-xl select-none"
					side={side}
				>
					<span className="flex flex-col">{menu}</span>
					<DropdownMenuPrimitive.Arrow className="-mt-px border-border fill-background drop-shadow-[0_1px_0] drop-shadow-border" />
				</DropdownMenuPrimitive.Content>
			</DropdownMenuPrimitive.Portal>
		</DropdownMenuPrimitive.Root>
	);
};

export default DropdownMenu;
