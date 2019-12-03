declare class HSVaColor {
	/**
	 * Converts the object to a hsva array
	 */
	toHSVA(): number[];
	/**
	 * Converts the object to a hsla array
	 */
	toHSLA(): number[];
	/**
	 * Converts the object to a rgba array.
	 */
	toRGBA(): number[];
	/**
	 * Converts the object to a hexa-decimal array.
	 */
	toHEX(): string;
	/**
	 * Converts the object to a cymk array.
	 */
	toCMYK(): number[];
	/**
	 * Clones the color object.
	 */
	clone(): HSVaColor;
}


declare interface InitOption {
	/**
	 * Selector or element which will be replaced with the actual color-picker.
	 * Can be a HTMLElement.
	 */
	el: string | HTMLElement;
    /**
	 * Using the 'el' Element as button, won't replace it with the pickr-button.
	 * If true, appendToBody will also be automatically true.
	 */
	useAsButton?: boolean;
	/**
	 * Start state. If true 'disabled' will be added to the button's classlist.
	 */
	disabled?: boolean;
	/**
	 * If set to false it would directly apply the selected color on the button and preview.
	 */
	comparison?: boolean;
	/**
	 * Default color
	 */
	default?: string;
	/**
	 * Default color representation.
	 */
	defaultRepresentation?: `HEX` | `RGBA` | `HSVA` | `HSLA` | `CMYK`;
	/**
	 * Option to keep the color picker always visible. You can still hide / show it via
	 * 'pickr.hide()' and 'pickr.show()'. The save button keeps his functionality, so if
	 * you click it, it will fire the onSave event.
	 */
	showAlways?: boolean;
	/**
	 * Defines a parent for pickr, if useAsButton is true and a parent is NOT defined
	 * 'body' will be used as fallback.
	 */
	parent?: HTMLElement;
	/**
	 * Close pickr with this specific key.
	 * Default is 'Escape'. Can be the event key or code.
	 */
	closeWithKey?: string | number;
	/**
	 * Defines the position of the color-picker. Available options are
	 * top, left and middle relativ to the picker button.
	 * If clipping occurs, the color picker will automatically choose his position.
	 */
	position?: 'middle' | 'top' | 'left';
	/**
	 * Enables the ability to change numbers in an input field with the scroll-wheel.
	 *  To use it set the cursor on a position where a number is and scroll, use ctrl to make steps of five
	 */
	adjustableNumbers?: boolean;
	/**
	 * Show or hide specific components.
	 *  By default only the palette (and the save button) is visible.
	 */
	components?: {
		/**
		 * Left side color comparison
		 */
		preview?: boolean,
		/**
		 * Opacity slider
		 */
		opacity?: boolean,
		/**
		 *  Hue slider
		 */
		hue?: boolean,
		/**
		 * Bottom interaction bar, theoretically you could use 'true' as propery.
		 * But this would also hide the save-button.
		 */
		interaction?: {
			/**
			 * hex option  (hexadecimal representation of the rgba value)
			 */
			hex?: boolean,
			/**
			 *  rgba option (red green blue and alpha)
			 */
			rgba?: boolean,
			/**
			 * hsla option (hue saturation lightness and alpha)
			 */
			hsla?: boolean,
			/**
			 * hsva option (hue saturation value and alpha)
			 */
			hsva?: boolean,
			/**
			 * cmyk option (cyan mangenta yellow key )
			 */
			cmyk?: boolean,
			/**
			 * input / output element
			 */
			input?: boolean,
			/**
			 * Button which provides the ability to select no color,
			 */
			clear?: boolean,
			/**
			 * Save button
			 */
			save?: boolean
		},
	},
	/**
	 * Button strings, brings the possibility to use a language other than English.
	 */
	strings?: {
		/**
		 * Default for save button
		 */
		save?: string,
		/**
		 * Default for clear button
		 */
		clear?: string
	},
	// User has changed the color
	onChange?: (hsva: HSVaColor, instance: Pickr) => void;
	// User has clicked the save button
	onSave?: (hsva: HSVaColor, instance: Pickr) => void;
	// Cancel
	onCancel?: (instance: Pickr) => void;
	// onDisplay
	onDisplay?: (instance: Pickr) => void;
}

export default class Pickr {
	/**
	 * Creates a new instance.
	 * @param options 
	 */
	static create(options: InitOption): Pickr;


	constructor(option: InitOption);
	/**
	 * Set an color, returns true if the color has been accepted.
	 * @param h 
	 * @param s 
	 * @param v 
	 * @param a 
	 * @param silent 
	 */
	setHSVA(h: number, s: number, v: number, a: number, silent: boolean): boolean;
	/**
	 * Parses a string which represents a color (e.g. #fff, rgb(10, 156, 23)), returns true if the color has been accepted. null will clear the color.
	 * @param string 
	 * @param silent If true (Default is false), the button won't change the current color. 
	 */
	setColor(string: string, silent?: boolean): boolean;
	/**
	 *  Shows the color-picker, returns instance.
	 */
	show(): Pickr;
	/**
	 * Hides the color-picker, returns instance.
	 */
	hide(): Pickr;
	/**
	 * Disables pickr and adds the disabled class to the button, returns instance.
	 */
	disable(): Pickr;
	/**
	 * Enables pickr and removes the disabled class from the button, returns instance.
	 */
	enable(): Pickr;
	/**
	 * Returns true if the color picker is currently open.
	 */
	isOpen(): boolean;
	/**
	 * Returns the root DOM-Element of the color-picker.
	 */
	getRoot(): { app: HTMLElement, button: HTMLElement, root: HTMLElement, hue: any, interaction: any, opacity: any, palette: any, preview: any };
	/**
	 * Returns the current HSVaColor object.
	 */
	getColor(): HSVaColor;
	/**
	 * Destroy's all functionality.
	 */
	destroy(): HSVaColor;
	/**
	 * Destroy's all functionality, moreover it removes the pickr element including the button.
	 */
	destroyAndRemove(): HSVaColor;
	/**
	 * Change the current color-representation. Valid options are HEX, RGBA, HSVA, HSLA and CMYK, returns false if type was invalid.
	 * @param type 
	 */
	setColorRepresentation(type: 'HEX' | 'RGBA' | 'HSVA' | 'HSLA' | 'CMYK'): boolean;
}