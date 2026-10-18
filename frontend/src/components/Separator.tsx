import * as SeparatorPrimitive from "@radix-ui/react-separator";

type Props = React.ComponentProps<typeof SeparatorPrimitive.Root>;

const Separator = (props: Props) => {
	return (
		<SeparatorPrimitive.Root
			{...props}
			className="my-1 bg-zinc-500/25 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px"
		/>
	);
};

export default Separator;
