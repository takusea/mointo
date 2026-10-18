import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import Editor from "~/editor/Editor";
import AppProviders from "~/editor/EditorProviders";

const preventDefault = (event: Event) => event.preventDefault();
const preventWheelDefault = (event: WheelEvent) => {
	if (event.ctrlKey) {
		event.preventDefault();
	}
};
const preventKeydownDefault = (event: KeyboardEvent) => {
	if (event.key === "Escape") {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		return;
	}

	const target = event.target;
	const ignoredKeys = [
		"Tab",
		"Enter",
		"ArrowUp",
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
	];
	if (
		ignoredKeys.includes(event.key) ||
		(target instanceof HTMLElement &&
			(target.isContentEditable || target.closest("input, textarea, select")))
	) {
		return;
	}

	event.preventDefault();
};

document.addEventListener("contextmenu", preventDefault);
document.addEventListener("wheel", preventWheelDefault, { passive: false });
document.addEventListener("keydown", preventKeydownDefault);

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error('Root element with id "root" was not found.');
}

createRoot(rootElement).render(
	<StrictMode>
		<AppProviders>
			<Editor />
		</AppProviders>
	</StrictMode>,
);
