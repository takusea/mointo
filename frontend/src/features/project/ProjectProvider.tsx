import { createContext, type JSX, useState } from "react";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";

type ProjectContextValue = {
	savedRevision: number;
	setSavedRevision: (revision: number) => void;
};

export const ProjectContext = createContext<ProjectContextValue | null>(null);

type Props = { children: JSX.Element };

export const ProjectProvider = ({ children }: Props) => {
	const { revision } = useCoreSnapshot();
	const [savedRevision, setSavedRevision] = useState(revision);

	return (
		<ProjectContext value={{ savedRevision, setSavedRevision }}>
			{children}
		</ProjectContext>
	);
};
