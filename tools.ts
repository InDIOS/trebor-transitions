import hash from 'hash-sum';
import transition, { easeIn } from './transition';

interface AnimationInstance {
	state: 'in' | 'out';
	ended(handler: () => void): void;
	in(node: HTMLElement, d?: number, l?: number): void;
	run(node: HTMLElement, d?: number, l?: number): void;
	out(node: HTMLElement, d?: number, l?: number): void;
}

interface Options {
	delay?: number;
	duration?: number;
	ease?: (x: number) => number;
}

export function animate(options: Options, run: (node: HTMLElement) => (progress: number) => string) {
	let style = <HTMLStyleElement>document.querySelector('[animation-style-sheet]');
	if (!style) {
		style = document.createElement('style');
		style.setAttribute('animation-style-sheet', '');
		document.head.appendChild(style);
	}
	let el: HTMLElement, styleIndex: number;
	let styleSheet = <CSSStyleSheet>style.sheet;
	let className = `animation_${hash(run)}`;
	let { ease, delay, duration } = { ...{ delay: 0, duration: 400, ease: easeIn }, ...options };
	let inAnimation = transition({ duration, delay, ease });
	let outAnimation = transition({ duration, delay, ease: (x: number) => 1 - ease(1 - x) });

	function setChangeCB(node: HTMLElement, animation: string, ...args: any[]) {
		el = node;
		let anime = animation === 'in' ? inAnimation : outAnimation;
		let change = run(node);
		el.classList.add(className);
		anime.on('change', progress => {
			styleSheet.cssRules.length && styleSheet.deleteRule(styleIndex);
			let styleTxt = change(animation === 'in' ? progress : 1 - progress);
			styleSheet.insertRule(`.${className}{${styleTxt}}`);
			styleIndex = styleSheet.cssRules.length - 1;
		});
		anime.run(...args);
	}

	return <AnimationInstance>{
		state: 'in',
		started: false,
		ended(handler?: () => void) {
			let callback = () => {
				el.classList.remove(className);
				handler && handler();
				styleSheet.deleteRule(styleIndex);
			};
			inAnimation.on('ended', callback);
			outAnimation.on('ended', () => {
				callback();
			});
		},
		run(node: HTMLElement, ...args: any[]) {
			let self = this;
			if (self.state === 'in') {
				self.in(node, ...args);
				self.state = 'out';
			} else {
				self.out(node, ...args);
				self.state = 'in';
			}
		},
		in(node: HTMLElement, ...args: any[]) {
			setChangeCB(node, 'in', ...args);
		},
		out(node: HTMLElement, ...args: any[]) {
			setChangeCB(node, 'out', ...args);
		}
	};
}