import type { Transform, Language } from '../types.js';

// Conservative heuristic entity generalization.
// No NLP model. Uses: known org suffixes, curated city list, curated first-name list.
// False negative rate is intentionally high — prefer precision over recall.

const ORG_SUFFIX_PATTERN =
  /\b[A-ZÜÖÄ][a-zA-ZäöüßÄÖÜ]+(?:\s+(?:&\s+)?[A-ZÜÖÄ][a-zA-ZäöüßÄÖÜ]+)?\s+(?:GmbH|AG|Ltd\.?|LLC|Corp\.?|Inc\.?|SE|KG|OHG|gGmbH|PLC|GbR)\b/g;

const CITIES_DE = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
  'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg',
  'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Karlsruhe',
  'Mannheim', 'Augsburg', 'Wiesbaden', 'Gelsenkirchen', 'Mönchengladbach',
  'Wien', 'Zürich', 'Basel', 'Bern', 'Graz', 'Salzburg', 'Linz', 'Innsbruck',
  'Lausanne', 'Genf', 'Luzern', 'Winterthur', 'Klagenfurt',
];

const CITIES_EN = [
  'London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool', 'Bristol',
  'Edinburgh', 'Leeds', 'Sheffield', 'Cardiff', 'Belfast', 'Newcastle',
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Boston',
  'Seattle', 'Denver', 'Washington', 'Nashville', 'Portland', 'Las Vegas',
  'Atlanta', 'Miami', 'Minneapolis', 'Detroit', 'Louisville', 'Baltimore',
  'Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Edmonton',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Auckland',
  'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Tokyo', 'Beijing',
];

// Conservative first-name list. Only high-confidence, unambiguous given names.
const FIRST_NAMES = new Set([
  // German male
  'Thomas', 'Michael', 'Andreas', 'Stefan', 'Christian', 'Peter', 'Klaus',
  'Werner', 'Joachim', 'Jürgen', 'Wolfgang', 'Karl', 'Heinz', 'Walter',
  'Helmut', 'Günter', 'Dieter', 'Gerhard', 'Rainer', 'Manfred', 'Horst',
  'Uwe', 'Bernd', 'Rolf', 'Markus', 'Frank', 'Oliver', 'Martin', 'Jan',
  'Lukas', 'Finn', 'Felix', 'Jonas', 'Maximilian', 'Paul', 'Leon', 'Elias',
  'Tobias', 'Florian', 'Philipp', 'Alexander', 'Sebastian', 'Dominic',
  // German female
  'Lena', 'Anna', 'Emma', 'Maria', 'Julia', 'Laura', 'Sarah', 'Lisa',
  'Hannah', 'Lea', 'Leonie', 'Mia', 'Clara', 'Sophie', 'Charlotte',
  'Katharina', 'Sandra', 'Nicole', 'Sabine', 'Stefanie', 'Petra', 'Claudia',
  'Monika', 'Ursula', 'Helga', 'Brigitte', 'Renate', 'Inge', 'Hildegard',
  // English male
  'John', 'James', 'Robert', 'David', 'William', 'Richard', 'Joseph',
  'Charles', 'Christopher', 'Matthew', 'Anthony', 'Donald', 'Mark', 'Paul',
  'Steven', 'George', 'Kenneth', 'Andrew', 'Edward', 'Brian', 'Ronald',
  'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas',
  'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
  // English female
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra',
  'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol',
  'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura',
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const entityGeneralization: Transform = {
  name: 'entity_generalization',

  apply(text: string, language: Language): string {
    let result = text;

    // 1. Organizations: word(s) + recognized legal suffix
    result = result.replace(ORG_SUFFIX_PATTERN, '[ORG]');

    // 2. Known cities (language-specific set)
    const cities = language === 'de' ? CITIES_DE : [...CITIES_DE, ...CITIES_EN];
    for (const city of cities) {
      result = result.replace(new RegExp(`\\b${escapeRegex(city)}\\b`, 'g'), '[CITY]');
    }

    // 3. Full-name pattern: KnownFirstName + any capitalized word
    //    Applies only when first word is in FIRST_NAMES.
    result = result.replace(
      /\b([A-ZÜÖÄ][a-züöäßÄÖÜ]+)\s+([A-ZÜÖÄ][a-züöäßÄÖÜ]+)\b/g,
      (match, first) => (FIRST_NAMES.has(first) ? '[PERSON]' : match),
    );

    return result;
  },
};
