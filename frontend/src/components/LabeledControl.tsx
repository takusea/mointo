import type { JSX } from "react";

type Props = {
	children: JSX.Element;
	label: string;
	sideElement?: JSX.Element;
	disabled?: boolean;
};

const LabeledControl = ({ children, label, sideElement, disabled }: Props) => {
	return (
		<div className="flex flex-col gap-1">
			<div
				className="flex min-h-6 items-center justify-between gap-1 aria-disabled:opacity-50"
				aria-disabled={disabled}
			>
				<span className="font-medium">{label}</span>
				<span>{sideElement}</span>
			</div>
			{children}
		</div>
	);
};

export default LabeledControl;
