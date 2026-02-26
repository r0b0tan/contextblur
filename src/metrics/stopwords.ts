// Embedded stopword lists — no external dependency.
// Used for stopwordRate computation in metrics/index.ts.

export const STOPWORDS_DE = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'einem',
  'einen', 'eines', 'und', 'oder', 'aber', 'wenn', 'weil', 'dass', 'ob', 'wie',
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mich', 'mir', 'dich', 'dir',
  'ihn', 'ihm', 'uns', 'euch', 'sich', 'man', 'nicht', 'kein', 'keine', 'keiner',
  'in', 'an', 'auf', 'zu', 'von', 'mit', 'bei', 'für', 'nach', 'vor', 'über',
  'unter', 'zwischen', 'durch', 'gegen', 'ohne', 'um', 'aus', 'bis', 'seit',
  'ist', 'war', 'sind', 'waren', 'wird', 'wurde', 'werden', 'wurden', 'hat',
  'haben', 'hatte', 'hatten', 'sein', 'bin', 'bist', 'seid', 'sei', 'wäre',
  'auch', 'noch', 'schon', 'nur', 'sehr', 'so', 'dann', 'da', 'hier', 'dort',
  'immer', 'nie', 'oft', 'mal', 'ja', 'nein', 'nun', 'jetzt', 'heute', 'mehr',
  'als', 'denn', 'wann', 'was', 'wer', 'wo', 'warum', 'welche', 'welcher',
  'dieser', 'diese', 'dieses', 'jener', 'jene', 'jenes', 'alle', 'alles', 'viele',
  'mein', 'meine', 'dein', 'deine', 'seine', 'ihre', 'unser', 'euer', 'deren',
  'dabei', 'damit', 'dazu', 'daher', 'deshalb', 'darum', 'jedoch', 'zwar',
  'bereits', 'eigentlich', 'einfach', 'natürlich', 'wirklich', 'ziemlich',
  'etwa', 'fast', 'kaum', 'vielleicht', 'wohl', 'eben', 'gerade', 'doch',
  'ganz', 'gar', 'jedenfalls', 'außerdem', 'zudem', 'trotzdem', 'dennoch',
]);

export const STOPWORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'when', 'because', 'that', 'which',
  'who', 'what', 'where', 'how', 'why', 'whether', 'as', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'may', 'might', 'can', 'could', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'now', 'then', 'here', 'there', 'also', 'already',
  'still', 'again', 'once', 'always', 'never', 'often', 'all', 'any', 'every',
  'much', 'several', 'am', 'been', 'got', 'get', 'even', 'well', 'back',
  'rather', 'quite', 'almost', 'perhaps', 'therefore', 'thus', 'however',
  'although', 'though', 'while', 'since', 'unless', 'until', 'despite',
  'without', 'within', 'against', 'along', 'around', 'among', 'across',
]);

export function getStopwords(language: 'de' | 'en'): Set<string> {
  return language === 'de' ? STOPWORDS_DE : STOPWORDS_EN;
}
