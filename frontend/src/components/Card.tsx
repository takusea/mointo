import type { JSX } from "react";

type Size = "small" | "medium" | "large";

type Props = {
	children: JSX.Element;
	size?: Size;
};

const Card = ({ children, size = "medium" }: Props) => {
	return (
		<div
			data-size={size}
			className="relative overflow-hidden border border-border bg-background backdrop-blur-xl data-[size=large]:rounded-3xl data-[size=large]:p-8 data-[size=medium]:rounded-2xl data-[size=medium]:p-4 data-[size=small]:rounded-xl data-[size=small]:p-2"
		>
			{children}
		</div>
	);
};

export default Card;
