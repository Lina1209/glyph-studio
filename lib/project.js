// Shared character groups used by the worksheet generator/importer.
// Keep this list aligned with the character sets in the main GlyphStudio editor.
export const CHARSET_GROUPS = [
  {
    id: 'cyrillic',
    name: 'Кириллица',
    chars: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя'
  },
  {
    id: 'latin',
    name: 'Латиница',
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  },
  {
    id: 'numbers',
    name: 'Цифры',
    chars: '0123456789'
  },
  {
    id: 'punctuation',
    name: 'Знаки',
    chars: '!?.,-:;()«»'
  }
];
