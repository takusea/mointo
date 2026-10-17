export type RGBAColor = {
	r: number;
	g: number;
	b: number;
	a: number;
};

export type HSVAColor = {
	h: number;
	s: number;
	v: number;
	a: number;
};

export function rgbaToHsva({ r, g, b, a }: RGBAColor): HSVAColor {
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	const delta = max - min;

	let h = 0;

	if (delta !== 0) {
		if (max === rNorm) {
			h = 60 * (((gNorm - bNorm) / delta) % 6);
		} else if (max === gNorm) {
			h = 60 * ((bNorm - rNorm) / delta + 2);
		} else {
			h = 60 * ((rNorm - gNorm) / delta + 4);
		}
	}

	if (h < 0) h += 360;

	const s = max === 0 ? 0 : delta / max;
	const v = max;

	return { h, s, v, a };
}

export function hsvaToRgba({ h, s, v, a }: HSVAColor): RGBAColor {
	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;

	let rPrime = 0;
	let gPrime = 0;
	let bPrime = 0;

	if (0 <= h && h < 60) {
		[rPrime, gPrime, bPrime] = [c, x, 0];
	} else if (60 <= h && h < 120) {
		[rPrime, gPrime, bPrime] = [x, c, 0];
	} else if (120 <= h && h < 180) {
		[rPrime, gPrime, bPrime] = [0, c, x];
	} else if (180 <= h && h < 240) {
		[rPrime, gPrime, bPrime] = [0, x, c];
	} else if (240 <= h && h < 300) {
		[rPrime, gPrime, bPrime] = [x, 0, c];
	} else if (300 <= h && h < 360) {
		[rPrime, gPrime, bPrime] = [c, 0, x];
	}

	return {
		r: Math.round((rPrime + m) * 255),
		g: Math.round((gPrime + m) * 255),
		b: Math.round((bPrime + m) * 255),
		a,
	};
}

export function hasSameRgbColor(a: HSVAColor, b: HSVAColor): boolean {
	const rgbaA = hsvaToRgba(a);
	const rgbaB = hsvaToRgba(b);
	return rgbaA.r === rgbaB.r && rgbaA.g === rgbaB.g && rgbaA.b === rgbaB.b;
}
