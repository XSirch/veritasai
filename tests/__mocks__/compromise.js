/**
 * Mock para compromise.js
 * Resolve problemas de plugin null nos testes
 */

const mockDoc = {
  text: jest.fn(() => 'mock text'),
  json: jest.fn(() => []),
  out: jest.fn(() => 'mock output'),
  wordCount: jest.fn(() => 5),
  sentences: jest.fn(() => mockDoc),
  nouns: jest.fn(() => mockDoc),
  verbs: jest.fn(() => mockDoc),
  adjectives: jest.fn(() => mockDoc),
  people: jest.fn(() => mockDoc),
  places: jest.fn(() => mockDoc),
  organizations: jest.fn(() => mockDoc),
  dates: jest.fn(() => mockDoc),
  numbers: jest.fn(() => mockDoc),
  money: jest.fn(() => mockDoc),
  percentages: jest.fn(() => mockDoc),
  phoneNumbers: jest.fn(() => mockDoc),
  emails: jest.fn(() => mockDoc),
  urls: jest.fn(() => mockDoc),
  hashtags: jest.fn(() => mockDoc),
  mentions: jest.fn(() => mockDoc),
  topics: jest.fn(() => mockDoc),
  terms: jest.fn(() => mockDoc),
  match: jest.fn(() => mockDoc),
  not: jest.fn(() => mockDoc),
  has: jest.fn(() => mockDoc),
  if: jest.fn(() => mockDoc),
  ifNo: jest.fn(() => mockDoc),
  before: jest.fn(() => mockDoc),
  after: jest.fn(() => mockDoc),
  first: jest.fn(() => mockDoc),
  last: jest.fn(() => mockDoc),
  slice: jest.fn(() => mockDoc),
  eq: jest.fn(() => mockDoc),
  length: 0,
  found: true
};

const mockNlp = jest.fn((text) => {
  mockDoc.text.mockReturnValue(text || 'mock text');
  return mockDoc;
});

// Adicionar métodos estáticos
mockNlp.plugin = jest.fn();
mockNlp.extend = jest.fn();
mockNlp.world = {
  addWords: jest.fn(),
  addTags: jest.fn(),
  addPatterns: jest.fn()
};

// Adicionar propriedades para plugins
mockNlp.numbers = jest.fn();
mockNlp.dates = jest.fn();

module.exports = mockNlp;
