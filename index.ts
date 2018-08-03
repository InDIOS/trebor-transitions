import { animate } from './tools';
import { cubicOut } from './transition';

interface FadeAnimationOptions {
	delay?: number;
	duration?: number;
}

export function FadeAnimation(options?: FadeAnimationOptions) {
	options = options || { delay: 0, duration: 400 };

	return animate(options, (node: HTMLElement) => {
		let opacity = +(getComputedStyle(node).opacity || 0);

		return (progress: number) => `opacity: ${progress * opacity};`;
	});
}

interface SlideAnimationOptions {
	x?: number;
	y?: number;
	delay?: number;
	duration?: number;
	ease?: (x: number) => number;
}

export function FlyAnimation(options?: SlideAnimationOptions) {
	options = options || { delay: 0, duration: 400, x: 0, y: 0, ease: cubicOut };

	return animate(options, (node: HTMLElement) => {
		let opacity: number, transform: string;
		let { x, y } = { ...{ x: 0, y: 0 }, ...options };
		const style = getComputedStyle(node);
		opacity = +(style.opacity || 0);
		transform = style.transform === 'none' ? '' : (style.transform ? `${style.transform} ` : '');

		return (progress: number) => `opacity: ${progress * opacity}; ` +
			`transform: ${transform}translate(${(1 - progress) * (x || 0)}px, ${(1 - progress) * (y || 0)}px);`;
	});
}

interface SlideAnimationOptions {
	delay?: number;
	duration?: number;
	ease?: (x: number) => number;
}

export function SlideAnimation(options?: SlideAnimationOptions) {
	options = options || { delay: 0, duration: 400, ease: cubicOut };

	return animate(options, (node: HTMLElement) => {
		let opacity: number, height: number, paddingTop: number, paddingBottom: number,
			marginTop: number, marginBottom: number, borderTopWidth: number, borderBottomWidth: number;
		const style = getComputedStyle(node);
		opacity = +(style.opacity || 0);
		height = parseFloat(style.height || '0');
		marginTop = parseFloat(style.marginTop || '0');
		paddingTop = parseFloat(style.paddingTop || '0');
		marginBottom = parseFloat(style.marginBottom || '0');
		paddingBottom = parseFloat(style.paddingBottom || '0');
		borderTopWidth = parseFloat(style.borderTopWidth || '0');
		borderBottomWidth = parseFloat(style.borderBottomWidth || '0');

		return (progress: number) => `overflow: hidden;` +
			`height: ${progress * height}px;` +
			`margin-top: ${progress * marginTop}px;` +
			`padding-top: ${progress * paddingTop}px;` +
			`margin-bottom: ${progress * marginBottom}px;` +
			`padding-bottom: ${progress * paddingBottom}px;` +
			`border-top-width: ${progress * borderTopWidth}px;` +
			`opacity: ${Math.min(progress * 20, 1) * opacity};` +
			`border-bottom-width: ${progress * borderBottomWidth}px;`;
	});
}
