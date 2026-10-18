import * as SliderPrimitive from "@radix-ui/react-slider";

type Props = React.ComponentProps<typeof SliderPrimitive.Root>;

const Slider = (props: Props) => {
	return (
		<SliderPrimitive.Root
			{...props}
			className="relative flex items-center h-8 cursor-pointer touch-none select-none"
		>
			<SliderPrimitive.Track className="relative h-2 grow rounded-full overflow-hidden">
				<div className="h-full w-full border border-zinc-500/40 bg-zinc-500/20 rounded-full"></div>
				<SliderPrimitive.Range className="absolute top-0 h-full bg-primary" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="block size-4 rounded-full border border-zinc-500/40 bg-white shadow-md" />
		</SliderPrimitive.Root>
	);
};

export default Slider;
