import { type JSX, useState } from "react";
import { useCoreSnapshot } from "~/core/useCoreSnapshot";
import { ProjectContext } from "./ProjectContext";

type Props = {
	children: JSX.Element;
};

export const ProjectProvider = ({ children }: Props) => {
	const { revision } = useCoreSnapshot();
	const [savedRevision, setSavedRevision] = useState(revision);

	return (
		<ProjectContext value={{ savedRevision, setSavedRevision }}>
			{children}
		</ProjectContext>
	);
};
