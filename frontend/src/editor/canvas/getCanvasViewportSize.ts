export const getCanvasViewportSize = (viewport: HTMLElement) => {
	const viewportBounds = viewport.getBoundingClientRect();
	const toolbar = document.querySelector<HTMLElement>("[data-canvas-toolbar]");
	const toolbarTop = toolbar?.getBoundingClientRect().top;

	return {
		width: viewport.clientWidth,
		height:
			toolbarTop == null
				? viewport.clientHeight
				: Math.min(
						viewport.clientHeight,
						Math.max(0, toolbarTop - viewportBounds.top),
					),
	};
};
