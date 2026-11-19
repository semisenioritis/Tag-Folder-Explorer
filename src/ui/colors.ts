/** Legend colors: name to CSS color value. */
export const colorDictionary: Record<string, string> = {
'red': '#ff0000',
'green': '#00ff00',
'blue': '#0000ff',
'yellow': '#ffff00',
'orange': '#ff8800',
'purple': '#800080',
};

/** CSS color for a legend color name, or "none" when the name is unknown. */
export function getColorForName(colorName: string): string {
const normalizedName = colorName.toLowerCase().trim();
if (colorDictionary[normalizedName]) {
return colorDictionary[normalizedName];
}
return 'none';
}