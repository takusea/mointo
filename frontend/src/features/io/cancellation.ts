export const throwIfIoCancelled = (signal: AbortSignal) => {
	if (signal.aborted) {
		throw new DOMException("The operation was cancelled.", "AbortError");
	}
};
