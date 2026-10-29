// The colour palette used everywhere you pick a colour: hues from red round to rose, each light → deep.
export const PALETTE_ROWS = [
  ['Red', ['#F7BABA', '#E76A6A', '#D53434', '#9B2727']],
  ['Coral', ['#F7C6BA', '#E7836A', '#D55434', '#9B3E27']],
  ['Orange', ['#F7D5BA', '#E7A06A', '#D57A34', '#9B5927']],
  ['Amber', ['#F7E3BA', '#E7BD6A', '#D5A034', '#9B7427']],
  ['Yellow', ['#F7EFBA', '#E7D66A', '#D5C034', '#9B8C27']],
  ['Lime', ['#E3F7BA', '#BDE76A', '#A0D534', '#749B27']],
  ['Green', ['#BAF7C4', '#6AE77F', '#34D54F', '#279B3A']],
  ['Teal', ['#BAF7EB', '#6AE7CE', '#34D5B5', '#279B84']],
  ['Cyan', ['#BAEFF7', '#6AD6E7', '#34C0D5', '#278C9B']],
  ['Sky', ['#BADEF7', '#6AB3E7', '#3492D5', '#276B9B']],
  ['Blue', ['#BACDF7', '#6A8FE7', '#3464D5', '#274A9B']],
  ['Indigo', ['#BABAF7', '#6A6AE7', '#3434D5', '#27279B']],
  ['Violet', ['#D1BAF7', '#986AE7', '#6F34D5', '#51279B']],
  ['Purple', ['#E5BAF7', '#C16AE7', '#A534D5', '#78279B']],
  ['Magenta', ['#F7BAF2', '#E76ADC', '#D534C8', '#9B2791']],
  ['Pink', ['#F7BAD9', '#E76AA8', '#D53485', '#9B2761']],
  ['Rose', ['#F7BAC6', '#E76A83', '#D53454', '#9B273E']],
  ['Neutral', ['#D7CCC8', '#A1887F', '#8D6E63', '#5D4037']],
  ['Gray', ['#CFD8DC', '#90A4AE', '#78909C', '#455A64']],
  ['Mono', ['#FFFFFF', '#BDBDBD', '#616161', '#212121']],
];
export const PALETTE = PALETTE_ROWS.flatMap(([, row]) => row);
// a lively middle shade of each hue, for quick-pick rows
export const QUICK_COLORS = PALETTE_ROWS.slice(0, 17).map(([, row]) => row[1]);
