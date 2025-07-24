/**
 * Testes unitários para KeywordExtractor
 * Testa funcionalidades de extração de palavras-chave e análise de texto
 */

const KeywordExtractor = require('../../src/utils/keyword-extractor');

describe('KeywordExtractor', () => {
  let extractor;
  
  beforeEach(() => {
    extractor = new KeywordExtractor();
  });
  
  describe('Inicialização', () => {
    test('deve criar instância com configurações padrão', () => {
      expect(extractor).toBeInstanceOf(KeywordExtractor);
      expect(extractor.options.maxKeywords).toBe(10);
      expect(extractor.options.minWordLength).toBe(3);
      expect(extractor.options.language).toBe('pt');
    });
    
    test('deve aceitar configurações customizadas', () => {
      const customExtractor = new KeywordExtractor({
        maxKeywords: 5,
        minWordLength: 4,
        language: 'en'
      });
      
      expect(customExtractor.options.maxKeywords).toBe(5);
      expect(customExtractor.options.minWordLength).toBe(4);
      expect(customExtractor.options.language).toBe('en');
    });
  });
  
  describe('Extração básica', () => {
    test('deve extrair palavras-chave de texto simples', () => {
      const text = 'O presidente brasileiro fez uma declaração importante sobre a economia nacional.';
      const result = extractor.extract(text);
      
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('processingTime');
      expect(result.keywords).toBeInstanceOf(Array);
      expect(result.keywords.length).toBeGreaterThan(0);
    });
    
    test('deve rejeitar entrada inválida', () => {
      expect(() => extractor.extract('')).toThrow();
      expect(() => extractor.extract(null)).toThrow();
      expect(() => extractor.extract(123)).toThrow();
    });
    
    test('deve processar texto em tempo hábil', () => {
      const text = 'Texto de teste para verificar performance do extrator de palavras-chave.';
      const result = extractor.extract(text);
      
      expect(result.processingTime).toBeLessThan(1000); // menos de 1 segundo
    });
  });
  
  describe('Extração de entidades', () => {
    test('deve extrair pessoas', () => {
      const text = 'João Silva e Maria Santos participaram da reunião.';
      const result = extractor.extract(text);
      
      const people = result.entities.filter(e => e.type === 'person');
      expect(people.length).toBeGreaterThan(0);
    });
    
    test('deve extrair lugares', () => {
      const text = 'A conferência aconteceu em São Paulo, Brasil.';
      const result = extractor.extract(text);
      
      const places = result.entities.filter(e => e.type === 'place');
      expect(places.length).toBeGreaterThan(0);
    });
  });
  
  describe('Extração de números', () => {
    test('deve extrair percentuais', () => {
      const text = 'A inflação subiu 5,2 por cento no último mês.';
      const result = extractor.extract(text);

      const percentages = result.numbers.filter(n => n.type === 'percentage');
      expect(percentages.length).toBeGreaterThan(0);
    });
    
    test('deve extrair valores monetários', () => {
      const text = 'O investimento foi de R$ 1,5 milhão.';
      const result = extractor.extract(text);
      
      const money = result.numbers.filter(n => n.type === 'money');
      expect(money.length).toBeGreaterThan(0);
    });
  });
  
  describe('Detecção de claims', () => {
    test('deve detectar afirmações políticas', () => {
      const text = 'O presidente afirmou que a economia cresceu 3% este ano.';
      const result = extractor.extract(text);
      
      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims[0];
      expect(claim).toHaveProperty('text');
      expect(claim).toHaveProperty('type');
      expect(claim).toHaveProperty('confidence');
    });
    
    test('deve detectar declarações com verbos de afirmação', () => {
      const text = 'O ministro afirma que as medidas serão implementadas.';
      const result = extractor.extract(text);

      const statements = result.claims.filter(c => c.type === 'statement');
      expect(statements.length).toBeGreaterThan(0);
    });
  });
  
  describe('Análise de sentimento', () => {
    test('deve detectar sentimento positivo', () => {
      const text = 'Esta é uma excelente notícia para todos os brasileiros.';
      const result = extractor.extract(text);
      
      expect(result.sentiment.classification).toBe('positive');
      expect(result.sentiment.score).toBeGreaterThan(0);
    });
    
    test('deve detectar sentimento negativo', () => {
      const text = 'Esta é uma terrível notícia que preocupa a população.';
      const result = extractor.extract(text);
      
      expect(result.sentiment.classification).toBe('negative');
      expect(result.sentiment.score).toBeLessThan(0);
    });
    
    test('deve detectar sentimento neutro', () => {
      const text = 'O relatório foi publicado na data prevista.';
      const result = extractor.extract(text);
      
      expect(result.sentiment.classification).toBe('neutral');
    });
  });
  
  describe('Detecção de urgência', () => {
    test('deve detectar palavras de urgência', () => {
      const text = 'URGENTE: Nova medida deve ser implementada imediatamente!';
      const result = extractor.extract(text);
      
      expect(result.urgencyIndicators.length).toBeGreaterThan(0);
      const urgencyWords = result.urgencyIndicators.filter(i => i.type === 'urgency');
      expect(urgencyWords.length).toBeGreaterThan(0);
    });
    
    test('deve detectar exclamações múltiplas', () => {
      const text = 'Atenção!!! Esta informação é muito importante!!!';
      const result = extractor.extract(text);
      
      const exclamations = result.urgencyIndicators.filter(i => i.word === 'multiple_exclamations');
      expect(exclamations.length).toBeGreaterThan(0);
    });
  });
  
  describe('Extração para fact-checking', () => {
    test('deve extrair keywords otimizadas para fact-checking', () => {
      const text = 'O presidente João Silva afirmou que a economia cresceu 5% em São Paulo.';
      const keywords = extractor.extractForFactCheck(text);
      
      expect(keywords).toBeInstanceOf(Array);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(8);
    });
    
    test('deve priorizar entidades e números', () => {
      const text = 'Maria Santos disse que 80% dos brasileiros apoiam a medida.';
      const keywords = extractor.extractForFactCheck(text);
      
      // Deve incluir a pessoa e o percentual
      expect(keywords.some(k => k.includes('Maria') || k.includes('Santos'))).toBeTruthy();
      expect(keywords.some(k => k.includes('80%') || k.includes('80'))).toBeTruthy();
    });
  });
  
  describe('Extração especializada', () => {
    test('deve extrair termos políticos', () => {
      const text = 'O governo federal anunciou novas políticas para o congresso nacional.';
      const result = extractor.extractSpecialized(text, 'political');
      
      expect(result.specialization).toBe('political');
      expect(result.politicalTerms).toBeInstanceOf(Array);
      expect(result.politicalTerms.length).toBeGreaterThan(0);
    });
    
    test('deve extrair termos de saúde', () => {
      const text = 'O novo medicamento trata eficazmente a doença viral.';
      const result = extractor.extractSpecialized(text, 'health');
      
      expect(result.specialization).toBe('health');
      expect(result.healthTerms).toBeInstanceOf(Array);
      expect(result.healthTerms.length).toBeGreaterThan(0);
    });
    
    test('deve extrair termos científicos', () => {
      const text = 'A pesquisa da universidade comprovou a teoria através de experimentos.';
      const result = extractor.extractSpecialized(text, 'science');
      
      expect(result.specialization).toBe('science');
      expect(result.scienceTerms).toBeInstanceOf(Array);
      expect(result.scienceTerms.length).toBeGreaterThan(0);
    });
  });
  
  describe('Detecção de padrões de desinformação', () => {
    test('deve detectar linguagem sensacionalista', () => {
      const text = 'Você não vai acreditar no que a mídia não quer que você saiba!';
      const result = extractor.detectMisinformationPatterns(text);
      
      expect(result.indicators.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('high');
      
      const sensational = result.indicators.filter(i => i.type === 'sensational_language');
      expect(sensational.length).toBeGreaterThan(0);
    });
    
    test('deve detectar urgência excessiva', () => {
      const text = 'Compartilhe antes que seja tarde! Última chance!';
      const result = extractor.detectMisinformationPatterns(text);
      
      const urgency = result.indicators.filter(i => i.type === 'excessive_urgency');
      expect(urgency.length).toBeGreaterThan(0);
    });
    
    test('deve calcular score de risco corretamente', () => {
      const lowRiskText = 'Segundo estudo da universidade, os dados mostram crescimento.';
      const highRiskText = 'Você não vai acreditar! Verdade oculta que eles não querem que você saiba!';
      
      const lowRisk = extractor.detectMisinformationPatterns(lowRiskText);
      const highRisk = extractor.detectMisinformationPatterns(highRiskText);
      
      expect(lowRisk.riskScore).toBeLessThan(highRisk.riskScore);
      expect(lowRisk.riskLevel).toBe('low');
      expect(highRisk.riskLevel).toBe('high');
    });
  });
  
  describe('Análise de credibilidade', () => {
    test('deve detectar indicadores positivos de credibilidade', () => {
      const text = 'Segundo estudo publicado na revista científica, os dados confirmam a hipótese.';
      const result = extractor.analyzeCredibility(text);
      
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.level).toBe('high');
      expect(result.positiveSignals).toBeGreaterThan(0);
    });
    
    test('deve detectar indicadores negativos de credibilidade', () => {
      const text = 'Ouvi dizer que alguém falou sobre um boato não confirmado.';
      const result = extractor.analyzeCredibility(text);
      
      expect(result.score).toBeLessThan(0.5);
      expect(result.level).toBe('low');
      expect(result.negativeSignals).toBeGreaterThan(0);
    });
  });
  
  describe('Performance', () => {
    test('deve processar texto longo em tempo adequado', () => {
      const longText = 'Este é um texto muito longo. '.repeat(100);
      const startTime = Date.now();
      
      const result = extractor.extract(longText);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500); // menos de 500ms
      expect(result.processingTime).toBeLessThan(100); // menos de 100ms interno
    });
    
    test('deve manter precisão com textos de diferentes tamanhos', () => {
      const shortText = 'Texto curto.';
      const mediumText = 'Este é um texto de tamanho médio com algumas palavras importantes.';
      const longText = 'Este é um texto muito longo que contém várias informações importantes, números como 50%, pessoas como João Silva, e lugares como São Paulo. O texto deve ser processado corretamente independente do tamanho.';
      
      const shortResult = extractor.extract(shortText);
      const mediumResult = extractor.extract(mediumText);
      const longResult = extractor.extract(longText);
      
      expect(shortResult.keywords).toBeInstanceOf(Array);
      expect(mediumResult.keywords).toBeInstanceOf(Array);
      expect(longResult.keywords).toBeInstanceOf(Array);
      
      // Texto longo deve ter mais keywords
      expect(longResult.keywords.length).toBeGreaterThan(shortResult.keywords.length);
    });
  });
});
