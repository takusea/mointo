import * as ProgressPrimitive from "@radix-ui/react-progress";

type Props = React.ComponentProps<typeof ProgressPrimitive.Root>;

const Progress = (props: Props) => {
	return (
		<ProgressPrimitive.Root
			className="h-2 overflow-hidden rounded-full bg-border"
			style={{
				transform: "translateZ(0)",
			}}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className="h-full bg-primary transition-transform"
				style={{
					transform: `translateX(-${100 - ((props.value ?? 0) / (props.max ?? 100)) * 100}%)`,
				}}
			/>
		</ProgressPrimitive.Root>
	);
};

export default Progress;
