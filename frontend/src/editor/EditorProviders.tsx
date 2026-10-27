import { MotionConfig } from "motion/react";
import { TooltipProvider } from "radix-ui/tooltip";
import type { JSX } from "react";
import { CoreProvider } from "~/core/CoreProvider";
import { DialogsProvider } from "~/editor/dialogs/DialogsProvider";
import { AppearanceProvider } from "~/features/appearance/AppearanceProvider";
import { ClipProvider } from "~/features/clip/ClipProvider";
import { I18nProvider } from "~/features/i18n/I18nProvider";
import { LayerProvider } from "~/features/layer/LayerProvider";
import { PlaybackProvider } from "~/features/playback/PlaybackProvider";
import { ProjectProvider } from "~/features/project/ProjectProvider";
import { ShortcutsProvider } from "~/features/shortcuts/ShortcutsProvider";
import { ToolProvider } from "~/features/tool/ToolProvider";
import { CanvasViewProvider } from "./canvas/CanvasViewProvider";

type Props = {
	children: JSX.Element;
};

function EditorProviders({ children }: Props) {
	return (
		<MotionConfig
			transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
			reducedMotion="user"
		>
			<TooltipProvider delayDuration={400}>
				<I18nProvider>
					<ShortcutsProvider>
						<AppearanceProvider>
							<CoreProvider>
								<ProjectProvider>
									<PlaybackProvider>
										<LayerProvider>
											<ToolProvider>
												<ClipProvider>
													<DialogsProvider>
														<CanvasViewProvider>{children}</CanvasViewProvider>
													</DialogsProvider>
												</ClipProvider>
											</ToolProvider>
										</LayerProvider>
									</PlaybackProvider>
								</ProjectProvider>
							</CoreProvider>
						</AppearanceProvider>
					</ShortcutsProvider>
				</I18nProvider>
			</TooltipProvider>
		</MotionConfig>
	);
}

export default EditorProviders;
