
/**
 * 在指定的一段时间内按照指定的间隔调用
 * @param callback 
 * @param ms 
 * @param duration 
 * @param args 
 */
export function setIntervalPro(callback: (...args: any[]) => void, ms: number,duration:number, ...args: any[]):void{
	const stamp = setInterval(callback,ms,...args);
	setTimeout(() => {
		clearInterval(stamp);
	}, duration);
}
