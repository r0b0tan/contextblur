// Embedded frequency classification for rareWordRate metric.
//
// Preferred approach: integrate 'word-frequency' npm package or a frequency corpus.
// Current fallback: words in COMMON_WORDS_* sets are "common"; all others are "rare".
// The sets cover the ~500 most frequent tokens in each language.
//
// To upgrade: replace isRareWord() with a function backed by a real frequency corpus
// while keeping the same interface — pipeline and metrics code requires no changes.

const COMMON_WORDS_EN = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
  'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look',
  'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
  'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us', 'great', 'between', 'need',
  'large', 'often', 'hand', 'high', 'place', 'hold', 'point', 'world', 'still',
  'own', 'man', 'here', 'where', 'much', 'through', 'before', 'should', 'very',
  'long', 'down', 'life', 'never', 'each', 'those', 'right', 'ask', 'show',
  'try', 'keep', 'child', 'few', 'play', 'small', 'end', 'put', 'home', 'read',
  'big', 'set', 'air', 'line', 'help', 'boy', 'follow', 'came', 'form', 'three',
  'sentence', 'tell', 'does', 'went', 'found', 'called', 'said', 'different',
  'number', 'head', 'around', 'order', 'move', 'part', 'below', 'country',
  'plant', 'last', 'school', 'father', 'tree', 'both', 'left', 'turn', 'open',
  'real', 'feel', 'city', 'state', 'without', 'once', 'white', 'least', 'paper',
  'together', 'group', 'always', 'music', 'book', 'letter', 'until', 'river',
  'car', 'care', 'second', 'enough', 'side', 'face', 'thing', 'stand', 'watch',
  'story', 'cut', 'done', 'hear', 'stop', 'since', 'walk', 'example', 'late',
  'miss', 'idea', 'body', 'ship', 'area', 'half', 'rock', 'order', 'fire',
  'south', 'piece', 'told', 'knew', 'pass', 'farm', 'top', 'whole', 'king',
  'space', 'heard', 'best', 'hour', 'better', 'true', 'during', 'hundred',
  'five', 'remember', 'step', 'early', 'hold', 'west', 'ground', 'interest',
  'reach', 'fast', 'five', 'sing', 'listen', 'six', 'table', 'travel', 'less',
  'morning', 'ten', 'simple', 'several', 'vowel', 'toward', 'war', 'lay', 'against',
  'pattern', 'slow', 'center', 'love', 'person', 'money', 'serve', 'appear',
  'road', 'map', 'rain', 'rule', 'govern', 'pull', 'cold', 'notice', 'voice',
  'power', 'town', 'fine', 'drive', 'short', 'lead', 'night', 'north', 'move',
  'plan', 'figure', 'star', 'box', 'noun', 'field', 'rest', 'correct', 'able',
  'pound', 'done', 'beauty', 'drive', 'stood', 'contain', 'front', 'teach',
  'week', 'final', 'gave', 'green', 'oh', 'quick', 'develop', 'ocean', 'warm',
  'free', 'minute', 'strong', 'special', 'behind', 'clear', 'tail', 'produce',
  'fact', 'street', 'inch', 'multiply', 'nothing', 'course', 'stay', 'wheel',
  'full', 'force', 'blue', 'object', 'decide', 'surface', 'deep', 'moon',
  'island', 'foot', 'busy', 'test', 'record', 'boat', 'common', 'gold', 'possible',
  'plane', 'instead', 'dry', 'wonder', 'laugh', 'thousand', 'ago', 'ran', 'check',
  'game', 'shape', 'equate', 'hot', 'miss', 'brought', 'heat', 'snow', 'bed',
  'bring', 'sit', 'perhaps', 'fill', 'east', 'paint', 'language', 'among',
]);

const COMMON_WORDS_DE = new Set([
  'der', 'die', 'das', 'und', 'in', 'ist', 'von', 'zu', 'den', 'mit', 'sich',
  'des', 'auf', 'für', 'nicht', 'eine', 'als', 'auch', 'an', 'es', 'bei',
  'dem', 'war', 'ein', 'so', 'man', 'noch', 'um', 'aus', 'haben', 'nach',
  'aber', 'oder', 'einer', 'werden', 'hat', 'über', 'wir', 'sie', 'ich',
  'nur', 'durch', 'da', 'wenn', 'diesem', 'kann', 'seiner', 'sind', 'im',
  'wie', 'mehr', 'wird', 'dann', 'alle', 'jetzt', 'vor', 'schon', 'hier',
  'ihr', 'bis', 'ihn', 'wurde', 'dass', 'weil', 'diese', 'sehr', 'mich',
  'du', 'mir', 'ihm', 'uns', 'kein', 'keine', 'viele', 'einen', 'einem',
  'ersten', 'anderen', 'wurden', 'jedoch', 'dabei', 'damit', 'dazu', 'daher',
  'deshalb', 'darum', 'ohne', 'zwischen', 'gegen', 'seit', 'unter', 'neue',
  'große', 'welche', 'welcher', 'wann', 'welches', 'kommt', 'gibt', 'geht',
  'macht', 'sagt', 'sehen', 'heute', 'immer', 'mal', 'ja', 'nein', 'nun',
  'doch', 'ganz', 'gar', 'eher', 'wohl', 'eben', 'gleich', 'lang', 'kurz',
  'alt', 'jung', 'gut', 'schlecht', 'groß', 'klein', 'hoch', 'tief', 'weit',
  'nah', 'bald', 'oft', 'kommen', 'gehen', 'sehen', 'wissen', 'denken',
  'glauben', 'finden', 'lassen', 'stehen', 'liegen', 'bleiben', 'nehmen',
  'bringen', 'halten', 'heißen', 'leben', 'arbeiten', 'spielen', 'sprechen',
  'schreiben', 'lesen', 'hören', 'wollen', 'sollen', 'müssen', 'dürfen',
  'mögen', 'können', 'laufen', 'geben', 'haus', 'stadt', 'land', 'welt',
  'mensch', 'kind', 'frau', 'mann', 'tag', 'jahr', 'zeit', 'weg', 'hand',
  'kopf', 'auge', 'herz', 'geld', 'arbeit', 'schule', 'buch', 'wort', 'frage',
  'antwort', 'problem', 'lösung', 'idee', 'seite', 'punkt', 'nummer', 'form',
  'art', 'weise', 'fall', 'grund', 'ende', 'anfang', 'mitte', 'seite', 'teil',
  'gruppe', 'zahl', 'wert', 'name', 'ort', 'raum', 'licht', 'farbe', 'stimme',
  'kraft', 'weg', 'straße', 'wald', 'baum', 'wasser', 'feuer', 'erde', 'luft',
  'nacht', 'morgen', 'abend', 'woche', 'monat', 'stunde', 'minute', 'sekunde',
  'ding', 'sache', 'beispiel', 'möglichkeit', 'wichtig', 'einfach', 'richtig',
  'falsch', 'schön', 'schwer', 'leicht', 'schnell', 'langsam', 'stark', 'schwach',
  'neu', 'alt', 'jung', 'erste', 'zweite', 'dritte', 'letzte', 'andere', 'gleiche',
  'selbst', 'viel', 'wenig', 'mehr', 'weniger', 'beide', 'jeder', 'jedes', 'jede',
  'klar', 'offen', 'schon', 'erst', 'immer', 'nie', 'oft', 'manchmal', 'selten',
  'plötzlich', 'gemeinsam', 'allein', 'zusammen', 'bereits', 'noch', 'weiter',
]);

export function isRareWord(word: string, language: 'de' | 'en'): boolean {
  const normalized = word.toLowerCase().replace(/[^a-züöäß]/g, '');
  if (normalized.length < 3) return false;
  const common = language === 'de' ? COMMON_WORDS_DE : COMMON_WORDS_EN;
  return !common.has(normalized);
}
