import { use } from "react";
import { IoProgressContext } from "./IoProgressContext";

export const useIoProgress = () => {
	const context = use(IoProgressContext);
	if (context == null) {
		throw new Error("IoProgressProvider is not provided");
	}
	return context;
};
