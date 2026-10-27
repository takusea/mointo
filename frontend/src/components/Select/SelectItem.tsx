import { IconCheck } from "@tabler/icons-react";
import * as SelectPrimitive from "radix-ui/select";

type Props = React.ComponentProps<typeof SelectPrimitive.Item>;

const SelectItem = ({ children, ...props }: Props) => {
	return (
		<SelectPrimitive.Item
			{...props}
			className="flex h-8 cursor-pointer items-center rounded-md p-2 px-8 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-clear-hover"
		>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator className="absolute left-2">
				<IconCheck size={16} />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
};

export default SelectItem;
