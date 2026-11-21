import { createContext } from "react";

type ProjectContextValue = {
	savedRevision: number;
	setSavedRevision: (revision: number) => void;
};

export const ProjectContext = createContext<ProjectContextValue | null>(null);
