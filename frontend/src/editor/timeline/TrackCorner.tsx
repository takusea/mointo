import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useMediaQuery } from "usehooks-ts";
import IconButton from "~/components/IconButton";
import { useI18n } from "~/features/i18n/useI18n";

type Props = {
	startFrame: number;
	currentFrame: number;
	endFrame: number;
	isCollapsed: boolean;
	onCollapsedChange: (value: boolean) => void;
};

const TrackCorner = ({
	startFrame,
	currentFrame,
	endFrame,
	isCollapsed,
	onCollapsedChange,
}: Props) => {
	const isDesktop = useMediaQuery("(min-width: 720px)");
	const { t } = useI18n();
	return (
		<div className="flex size-full items-center justify-between px-1">
			{!isDesktop && (
				<IconButton
					size="small"
					label={t(
						isCollapsed ? "timeline.expandTracks" : "timeline.collapseTracks",
					)}
					icon={isCollapsed ? IconChevronRight : IconChevronLeft}
					aria-expanded={!isCollapsed}
					onClick={() => onCollapsedChange(!isCollapsed)}
				/>
			)}
			{!isCollapsed && (
				<div className="flex size-full items-center justify-between px-1">
					<span>{startFrame}</span>
					<span>-</span>
					<span>{currentFrame}</span>
					<span>-</span>
					<span>{endFrame}</span>
				</div>
			)}
		</div>
	);
};

export default TrackCorner;
