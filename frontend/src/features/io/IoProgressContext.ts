import { createContext } from "react";
import type { MessageKey } from "~/features/i18n/I18nContext";

export type IoProgress = {
	completed: number;
	total: number;
};

export type IoProgressContextValue = {
	labelKey: MessageKey | null;
	progress: IoProgress | undefined;
	isCancelling: boolean;
	canCancel: boolean;
	start: (labelKey: MessageKey) => AbortSignal | undefined;
	setProgress: (progress: IoProgress) => void;
	setCancelable: (canCancel: boolean) => void;
	cancel: () => void;
	finish: () => void;
};

export const IoProgressContext = createContext<IoProgressContextValue | null>(
	null,
);
