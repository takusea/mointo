import { DropdownMenu } from "radix-ui";

type Props = React.ComponentProps<typeof DropdownMenu.RadioGroup>;

const DropdownMenuRadioGroup = (props: Props) => {
	return <DropdownMenu.RadioGroup {...props} className="content" />;
};

export default DropdownMenuRadioGroup;
