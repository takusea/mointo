import Button from "~/components/Button";
import Progress from "~/components/Progress";
import { useI18n } from "~/features/i18n/useI18n";
import { useIoProgress } from "./useIoProgress";

const IoProgressOverlay = () => {
	const { t } = useI18n();
	const { labelKey, progress, isCancelling, canCancel, cancel } =
		useIoProgress();

	if (labelKey == null) return null;

	return (
		<div
			className="fixed inset-0 z-200 grid place-items-center bg-black/40 p-6"
			role="status"
			aria-live="polite"
		>
			<div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 text-foreground shadow-xl">
				<div className="flex gap-2 font-medium">
					{!progress && (
						<div
							className="size-4 animate-spin self-center rounded-full border-2 border-border border-t-primary"
							aria-hidden="true"
						/>
					)}
					{t(labelKey)}
				</div>
				{progress && (
					<>
						<Progress value={progress.completed} max={progress.total} />
						<div className="flex items-center justify-between gap-1">
							<div className="text-right text-foreground-muted">
								{progress.completed}/{progress.total}
							</div>
							<Button
								label={t(isCancelling ? "io.cancelling" : "common.cancel")}
								disabled={isCancelling || !canCancel}
								onClick={cancel}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default IoProgressOverlay;
