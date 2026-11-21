import { type JSX, useState } from "react";
import { CanvasViewContext } from "./CanvasViewContext";

type Props = {
	children: JSX.Element;
};

export const CanvasViewProvider = ({ children }: Props) => {
	const [position, setPosition] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const [rotation, setRotation] = useState<number>(0);
	const [scale, setScale] = useState<number>(1);
	const [isFlippedHorizontal, setIsFlippedHorizontal] = useState(false);
	const [isFlippedVertical, setIsFlippedVertical] = useState(false);
	const [isGridVisible, setIsGridVisible] = useState(false);
	const [isOnionSkin, setIsOnionSkin] = useState(false);
	const [onionSkinOpacity, setOnionSkinOpacity] = useState(40);

	return (
		<CanvasViewContext
			value={{
				position,
				setPosition,
				rotation,
				setRotation,
				scale,
				setScale,
				isFlippedHorizontal,
				setIsFlippedHorizontal,
				isFlippedVertical,
				setIsFlippedVertical,
				isGridVisible,
				setIsGridVisible,
				isOnionSkin,
				setIsOnionSkin,
				onionSkinOpacity,
				setOnionSkinOpacity,
			}}
		>
			{children}
		</CanvasViewContext>
	);
};
