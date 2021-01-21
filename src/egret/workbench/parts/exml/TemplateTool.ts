/**
 * 模版
 *
 * @export
 * @class TemplateTool
 */
export default class TemplateTool {

	/**
	 * 创建一个EUI皮肤模板文件
	 */
	public static createEUIExmlSkin(states: string, initWidth: string, initHeight: string, _className: string): string {


		const xml: string = `<?xml version='1.0' encoding='utf-8'?>
<e:Skin class="skins.${_className}"
	${!states ? '' : 'states="' + states.toString() + '"'} width="${initWidth}"
	height="${initHeight}" xmlns:e="http://ns.egret.com/eui">
</e:Skin>`;
		return xml;
	}

	/**
	 * 生成默认wingproperties
	 */
	public static getWingProperties(): any {
		return { theme: 'resource/default.thm.json', resourcePlugin: { configs: [{ configPath: 'resource/default.res.json', relativePath: 'resource/' }] } };
	}
}