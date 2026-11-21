import { createContext } from "react";

type CanvasViewContextValue = {
	position: { x: number; y: number };
	setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
	rotation: number;
	setRotation: React.Dispatch<React.SetStateAction<number>>;
	scale: number;
	setScale: React.Dispatch<React.SetStateAction<number>>;
	isFlippedHorizontal: boolean;
	setIsFlippedHorizontal: React.Dispatch<React.SetStateAction<boolean>>;
	isFlippedVertical: boolean;
	setIsFlippedVertical: React.Dispatch<React.SetStateAction<boolean>>;
	isGridVisible: boolean;
	setIsGridVisible: React.Dispatch<React.SetStateAction<boolean>>;
	isOnionSkin: boolean;
	setIsOnionSkin: React.Dispatch<React.SetStateAction<boolean>>;
	onionSkinOpacity: number;
	setOnionSkinOpacity: React.Dispatch<React.SetStateAction<number>>;
};

export const CanvasViewContext = createContext<CanvasViewContextValue | null>(
	null,
);
