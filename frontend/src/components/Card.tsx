import type { JSX } from "react";

type Size = "small" | "medium" | "large";

type Props = {
	children: JSX.Element;
	size?: Size;
};

const padding = (size: Size) => {
	switch (size) {
		case "small":
			return "p-2 rounded-xl";
		case "medium":
			return "p-4 rounded-2xl";
		case "large":
			return "p-8 rounded-3xl";
	}
};

const Card = ({ children, size = "medium" }: Props) => {
	return (
		<div
			className={`relative overflow-hidden border border-zinc-500/40 bg-white/90 backdrop-blur-xl dark:bg-zinc-950/90 ${padding(size)}`}
		>
			{children}
		</div>
	);
};

export default Card;
