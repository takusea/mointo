import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

type Props = React.ComponentProps<typeof TooltipPrimitive.Root> & {
	label: string;
	shortcut?: string;
	side?: "top" | "right" | "bottom" | "left";
};

const Tooltip = ({ label, shortcut, side, children, ...props }: Props) => {
	const [isOpen, setOpen] = useState(false);
	const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const touchCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressTriggered = useRef(false);

	const clearTouchTimer = () => {
		if (touchTimer.current) clearTimeout(touchTimer.current);
		touchTimer.current = null;
	};

	const handlePointerDown = (event: React.PointerEvent) => {
		if (event.pointerType !== "touch") return;
		clearTouchTimer();
		if (touchCloseTimer.current) clearTimeout(touchCloseTimer.current);
		longPressTriggered.current = false;
		touchTimer.current = setTimeout(() => {
			longPressTriggered.current = true;
			setOpen(true);
		}, 500);
	};

	const handlePointerEnd = (event: React.PointerEvent) => {
		if (event.pointerType !== "touch") return;
		clearTouchTimer();
		if (longPressTriggered.current) {
			touchCloseTimer.current = setTimeout(() => setOpen(false), 1200);
		}
	};

	return (
		<TooltipPrimitive.Root {...props} open={isOpen} onOpenChange={setOpen}>
			<TooltipPrimitive.Trigger
				asChild
				onPointerDown={handlePointerDown}
				onPointerUp={handlePointerEnd}
				onPointerCancel={handlePointerEnd}
			>
				{children}
			</TooltipPrimitive.Trigger>
			<AnimatePresence>
				{isOpen && (
					<TooltipPrimitive.Portal forceMount>
						<TooltipPrimitive.Content asChild collisionPadding={8} side={side}>
							<motion.div
								className="z-50 rounded-md border border-border bg-background p-2 leading-none shadow-md backdrop-blur-xl select-none"
								initial={{ opacity: 0 }}
								exit={{ opacity: 0 }}
								animate={{ opacity: 1 }}
							>
								<span className="flex items-center gap-2">
									<span>{label}</span>
									{shortcut && <span className="opacity-50">{shortcut}</span>}
								</span>
								<TooltipPrimitive.Arrow className="-mt-px border-border fill-background drop-shadow-[0_1px_0] drop-shadow-border" />
							</motion.div>
						</TooltipPrimitive.Content>
					</TooltipPrimitive.Portal>
				)}
			</AnimatePresence>
		</TooltipPrimitive.Root>
	);
};

export default Tooltip;
