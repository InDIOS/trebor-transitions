export interface AnimationObject {
	play(): void;
	pause(): void;
	paused: boolean;
	running: boolean;
	run(duration?: number, dalay?: number): void;
	on(event: 'change', handler: (progress: number) => void): void;
	on(event: 'ended', handler: () => void): void;
}

export interface AnimationOptions {
	delay?: number;
	duration?: number;
	loop?: boolean;
	ease?(x: number): number;
}

const HALF = .5;
const { PI, pow, sin } = Math;

// These values are established by empiricism with tests (tradeoff: performance VS precision)
const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;

const kSplineTableSize = 11;
const kSampleStepSize = 1 / (kSplineTableSize - 1);

const float32ArraySupported = typeof Float32Array === 'function';

function C(aA1: number) { return 3 * aA1; }
function now() { return performance.now(); }
function B(aA1: number, aA2: number) { return C(aA2) - 6 * aA1; }
function A(aA1: number, aA2: number) { return 1 - C(aA2) + C(aA1); }

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier(aT: number, aA1: number, aA2: number) {
	return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope(aT: number, aA1: number, aA2: number) {
	return C(A(aA1, aA2) * aT * aT + 2 * B(aA1, aA2) * aT + C(aA1));
}

function binarySubdivide(aX: number, aA: number, aB: number, mX1: number, mX2: number) {
	let currentX, currentT, i = 0;
	do {
		currentT = aA + (aB - aA) / 2;
		currentX = calcBezier(currentT, mX1, mX2) - aX;
		if (currentX > 0) {
			aB = currentT;
		} else {
			aA = currentT;
		}
	} while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
	return currentT;
}

function newtonRaphsonIterate(aX: number, aGuessT: number, mX1: number, mX2: number) {
	for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
		let currentSlope = getSlope(aGuessT, mX1, mX2);
		if (currentSlope === 0) {
			return aGuessT;
		}
		let currentX = calcBezier(aGuessT, mX1, mX2) - aX;
		aGuessT -= currentX / currentSlope;
	}
	return aGuessT;
}

export function cubicBezier(mX1: number, mY1: number, mX2: number, mY2: number) {
	if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
		throw new Error('bezier x values must be in [0, 1] range');
	}

	if (mX1 === mY1 && mX2 === mY2) {
		return (x: number) => x;
	}

	// Precompute samples table
	let sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
	for (let i = 0; i < kSplineTableSize; ++i) {
		sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
	}

	function getTForX(aX: number) {
		let currentSample = 1;
		let intervalStart = 0;
		let lastSample = kSplineTableSize - 1;

		for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
			intervalStart += kSampleStepSize;
		}
		--currentSample;

		// Interpolate to provide an initial guess for t
		let dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
		let guessForT = intervalStart + dist * kSampleStepSize;

		let initialSlope = getSlope(guessForT, mX1, mX2);
		if (initialSlope >= NEWTON_MIN_SLOPE) {
			return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
		} else if (initialSlope === 0) {
			return guessForT;
		} else {
			return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
		}
	}

	return (x: number) => {
		// Because JavaScript number are imprecise, we should guarantee the extremes are right.
		if (x === 0) return 0;
		if (x === 1) return 1;
		return calcBezier(getTForX(x), mY1, mY2);
	};
}

export function bounceOut(t: number) {
	const c = .9, a = 4 / 11, b = 8 / 11;
	const ca = 4356 / 361, cb = 35442 / 1805, cc = 16061 / 1805, t2 = t * t;

	return t < a ? 7.5625 * t2 : t < b ? 9.075 * t2 - 9.9 * t + 3.4 : t < c ? ca * t2 - cb * t + cc : 10.8 * t * t - 20.52 * t + 10.72;
}

export function bounceInOut(t: number) {
	return t < HALF ? HALF * (1 - bounceOut(1 - t * 2)) : HALF * bounceOut(t * 2 - 1) + HALF;
}

export function bounceIn(t: number) {
	return 1 - bounceOut(1 - t);
}
export function elasticInOut(t: number) {
	return t < HALF
		? HALF * sin(13 * PI / 2 * 2 * t) * pow(2, 10 * (2 * t - 1))
		: HALF * sin(-13 * PI / 2 * ((2 * t - 1) + 1)) * pow(2, -10 * (2 * t - 1)) + 1;
}

export function elasticIn(t: number) {
	return sin(13 * t * PI / 2) * pow(2, 10 * (t - 1));
}

export function elasticOut(t: number) {
	return sin(-13 * (t + 1) * PI / 2) * pow(2, -10 * t) + 1;
}

export const snap = cubicBezier(0, 1, HALF, 1);
export const easeIn = cubicBezier(.42, 0, 1, 1);
export const easeOut = cubicBezier(0, 0, .58, 1);
export const inOut = cubicBezier(.42, 0, .58, 1);
export const linear = cubicBezier(.25, .25, .75, .75);
export const backIn = cubicBezier(.6, -.28, .735, .045);
export const circIn = cubicBezier(.6, .04, .98, .335);
export const cubicIn = cubicBezier(.55, .055, .675, .19);
export const expoIn = cubicBezier(.95, .05, .795, .035);
export const quadIn = cubicBezier(.55, .085, .68, .53);
export const quartIn = cubicBezier(.895, .03, .685, .22);
export const quintIn = cubicBezier(.755, .05, .855, .06);
export const sineIn = cubicBezier(.47, 0, .745, .715);
export const backOut = cubicBezier(.175, .885, .32, 1.275);
export const circOut = cubicBezier(.075, .82, .165, 1);
export const cubicOut = cubicBezier(.215, .61, .355, 1);
export const expoOut = cubicBezier(.19, 1, .22, 1);
export const quadOut = cubicBezier(.25, .46, .45, .94);
export const quartOut = cubicBezier(.165, .84, .44, 1);
export const quintOut = cubicBezier(.23, 1, .32, 1);
export const sineOut = cubicBezier(.39, .575, .565, 1);
export const backInOut = cubicBezier(.68, -.55, .265, 1.55);
export const circInOut = cubicBezier(.785, .135, .15, .86);
export const cubicInOut = cubicBezier(.645, .045, .355, 1);
export const expoInOut = cubicBezier(1, 0, 0, 1);
export const quadInOut = cubicBezier(.455, .03, .515, .955);
export const quartInOut = cubicBezier(.77, 0, .175, 1);
export const quintInOut = cubicBezier(.86, 0, .07, 1);
export const sineInOut = cubicBezier(.445, .05, .55, .95);

export default function transition({ ease = easeIn, duration, loop = false, delay = 0 }: AnimationOptions) {
	let diff = 0;
	let start: number, change: Function, ended: Function;
	function init(this: AnimationObject) {
		start = now();
		!this.running && (this.running = true);
		requestAnimationFrame(animate.bind(this));
	}
	function animate(this: AnimationObject, time: number) {
		if (this.paused || !change) return;
		// time fraction goes from 0 to 1
		let fraction = (time - start + diff) / (duration || 800);
		// calculate the current animation state
		let progress = ease(fraction > 1 ? fraction = 1 : fraction);
		// execute change each time during the animation
		change(progress);
		if (fraction < 1) {
			requestAnimationFrame(animate.bind(this));
		} else if (loop) {
			diff = 0;
			init.call(this);
		} else {
			this.running = false;
			// executed at the end
			ended && ended();
		}
	}
	return <AnimationObject>{
		paused: false,
		running: false,
		on(event: 'change' | 'ended', handler: (progress?: number) => void) {
			event === 'ended' && (ended = handler);
			event === 'change' && (change = handler);
		},
		run(d?: number, l?: number) {
			delay = l || delay || 0;
			duration = d || duration || 800;
			delay > 0 ? setTimeout(init.bind(this), delay) : init.call(this);
		},
		pause() {
			if (!this.running) return;
			this.paused = true;
			diff += now() - start;
		},
		play() {
			if (!this.running) return;
			this.paused = false;
			init.call(this);
		}
	};
}
