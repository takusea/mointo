import { type JSX, useRef, useState } from "react";
import type { MessageKey } from "~/features/i18n/I18nContext";
import { type IoProgress, IoProgressContext } from "./IoProgressContext";

type Props = {
	children: JSX.Element;
};

type Operation = {
	labelKey: MessageKey;
	progress: IoProgress | undefined;
	isCancelling: boolean;
	canCancel: boolean;
};

export const IoProgressProvider = ({ children }: Props) => {
	const controller = useRef<AbortController | null>(null);
	const [operation, setOperation] = useState<Operation | null>(null);

	const start = (labelKey: MessageKey) => {
		if (controller.current != null) return;
		const nextController = new AbortController();
		controller.current = nextController;
		setOperation({
			labelKey,
			progress: undefined,
			isCancelling: false,
			canCancel: true,
		});
		return nextController.signal;
	};
	const setProgress = (nextProgress: IoProgress) =>
		setOperation((current) =>
			current ? { ...current, progress: nextProgress } : current,
		);
	const setCancelable = (canCancel: boolean) =>
		setOperation((current) => (current ? { ...current, canCancel } : current));
	const cancel = () => {
		if (!controller.current || controller.current.signal.aborted) return;
		controller.current.abort();
		setOperation((current) =>
			current ? { ...current, isCancelling: true } : current,
		);
	};
	const finish = () => {
		controller.current = null;
		setOperation(null);
	};

	return (
		<IoProgressContext
			value={{
				labelKey: operation?.labelKey ?? null,
				progress: operation?.progress,
				isCancelling: operation?.isCancelling ?? false,
				canCancel: operation?.canCancel ?? false,
				start,
				setProgress,
				setCancelable,
				cancel,
				finish,
			}}
		>
			{children}
		</IoProgressContext>
	);
};
