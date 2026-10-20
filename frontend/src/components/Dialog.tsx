import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useI18n } from "~/features/i18n/useI18n";
import Button from "./Button";

type Props = React.ComponentProps<typeof DialogPrimitive.Root> & {
	title: string;
	description?: string;
	cancelText?: string;
	submitText?: string;
	onCancel?: () => void;
	onSubmit?: () => void;
};

const Dialog = ({
	title,
	description,
	cancelText,
	submitText,
	onCancel,
	onSubmit,
	children,
	...props
}: Props) => {
	const { t } = useI18n();
	return (
		<DialogPrimitive.Root {...props}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
				<DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 grid max-h-[85vh] w-[90vw] max-w-120 -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] gap-4 rounded-xl border border-border bg-background p-4 shadow-2xl backdrop-blur-xl">
					<div className="flex w-full items-start justify-between">
						<DialogPrimitive.Title className="font-medium text-lg">
							{title}
						</DialogPrimitive.Title>
					</div>
					{description && (
						<DialogPrimitive.Description>
							{description}
						</DialogPrimitive.Description>
					)}
					<div className="overflow-y-auto">{children}</div>
					<div className="flex w-full justify-end gap-1">
						<DialogPrimitive.Close asChild>
							<Button
								label={cancelText ?? t("common.close")}
								onClick={onCancel}
							/>
						</DialogPrimitive.Close>
						{submitText && (
							<DialogPrimitive.Close asChild>
								<Button
									variant="primary"
									label={submitText}
									onClick={onSubmit}
								/>
							</DialogPrimitive.Close>
						)}
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
};

export default Dialog;
