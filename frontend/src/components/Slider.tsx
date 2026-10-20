import * as SliderPrimitive from "@radix-ui/react-slider";

type Props = React.ComponentProps<typeof SliderPrimitive.Root>;

const Slider = (props: Props) => {
	return (
		<SliderPrimitive.Root
			{...props}
			className="relative flex h-8 cursor-pointer touch-none select-none items-center data-disabled:cursor-not-allowed data-disabled:opacity-50"
		>
			<SliderPrimitive.Track className="relative h-2 grow overflow-hidden rounded-full">
				<div className="size-full rounded-full border border-border bg-surface"></div>
				<SliderPrimitive.Range className="absolute top-0 h-full bg-primary" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="block size-4 rounded-full bg-white shadow-md ring-1 ring-border" />
		</SliderPrimitive.Root>
	);
};

export default Slider;
