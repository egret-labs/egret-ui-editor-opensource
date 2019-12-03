/**
 * 转义，将字符串中的\\转换成\,\\n转换成\n。此工具一般用于从xml中读到的属性等转换用。
 * @param str
 * @return 
 */
export function unescape(str: string): string {
	return EscapeCharacterUtil.unescape(str);
}
/**
 * 反转义符工具，将字符串中的\\转换成\,\\n转换成\n。此工具一般用于从xml中读到的属性等转换用。
 */
class EscapeCharacterUtil {
	private static escapeCharacterList: EscapeCharacter[];
	private static init(): void {
		EscapeCharacterUtil.escapeCharacterList = [];
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\a', '\a'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\b', '\b'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\f', '\f'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\n', '\n'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\r', '\r'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\t', '\t'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\v', '\v'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\\\', '\\'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\\'', '\''));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\\"', '\"'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\0', '\0'));
		EscapeCharacterUtil.escapeCharacterList.push(new EscapeCharacter('\\ddd', '\ddd'));
	}
	/**
	 * 转义，将字符串中的\\转换成\,\\n转换成\n。此工具一般用于从xml中读到的属性等转换用。
	 * @param str
	 * @return 
	 */
	public static unescape(str: string): string {
		if (!EscapeCharacterUtil.escapeCharacterList) {
			EscapeCharacterUtil.init();
		}
		let index = 0;
		while (index < str.length) {
			//最近的一个转义符
			var currentEscapeCharacter: EscapeCharacter;
			let currentIndex = -1;
			for (let i = 0; i < EscapeCharacterUtil.escapeCharacterList.length; i++) {
				const tmpIndex = str.indexOf(EscapeCharacterUtil.escapeCharacterList[i].source, index);
				if (currentIndex == -1 && tmpIndex != -1) {
					currentIndex = tmpIndex;
					currentEscapeCharacter = EscapeCharacterUtil.escapeCharacterList[i];
				}
				if (currentIndex != -1 && tmpIndex != -1) {
					if (tmpIndex < currentIndex) {
						currentIndex = tmpIndex;
						currentEscapeCharacter = EscapeCharacterUtil.escapeCharacterList[i];
					}
				}
			}
			if (currentIndex == -1) {
				break;
			} else {
				const str1: string = str.slice(0, currentIndex);
				const str2: string = currentEscapeCharacter.target;
				const str3: string = str.slice(currentIndex + currentEscapeCharacter.source.length);
				str = str1 + str2 + str3;
				index = currentIndex + currentEscapeCharacter.target.length;
			}
		}
		return str;
	}
}

/**
 * 转义字符 
 */
class EscapeCharacter {
	public source: string;
	public target: string;
	constructor(source: string, target: string) {
		this.source = source;
		this.target = target;
	}
}