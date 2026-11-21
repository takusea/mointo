import * as PopoverPrimitive from "@radix-ui/react-popover";
import { type JSX, useState } from "react";

type Props = React.ComponentProps<typeof PopoverPrimitive.Root> & {
	content: JSX.Element | string;
	side?: "top" | "right" | "bottom" | "left";
};

const Popover = ({ content, side, children, ...props }: Props) => {
	const [isOpen, setOpen] = useState(false);

	return (
		<PopoverPrimitive.Root {...props} open={isOpen} onOpenChange={setOpen}>
			<PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					collisionPadding={8}
					className="z-50 rounded-xl border border-border bg-background p-4 leading-none shadow-md backdrop-blur-xl select-none"
					side={side}
				>
					<span className="flex flex-col">{content}</span>
					<PopoverPrimitive.Arrow className="-mt-px border-border fill-background drop-shadow-[0_1px_0] drop-shadow-border" />
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
};

export default Popover;
