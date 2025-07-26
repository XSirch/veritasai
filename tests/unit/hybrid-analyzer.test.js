/**
 * Testes unitários para HybridAnalyzer
 * Testa orquestração de todos os serviços e análise híbrida
 */

const HybridAnalyzer = require('../../src/services/hybrid-analyzer');

// Mock dos serviços
jest.mock('../../src/services/google-fact-check-service');
jest.mock('../../src/services/groq-llm-service');
jest.mock('../../src/services/qdrant-client');
jest.mock('../../src/services/embedding-service', () => {
  return jest.fn().mockImplementation(() => ({
    generateFactCheckEmbedding: jest.fn(),
    searchSimilar: jest.fn(),
    integrateWithQdrant: jest.fn(),
    getStats: jest.fn(() => ({ requests: 0 }))
  }));
});
jest.mock('../../src/utils/keyword-extractor');

const GoogleFactCheckService = require('../../src/services/google-fact-check-service');
const GroqLLMService = require('../../src/services/groq-llm-service');
const QdrantClient = require('../../src/services/qdrant-client');
const EmbeddingService = require('../../src/services/embedding-service');
const KeywordExtractor = require('../../src/utils/keyword-extractor');

describe('HybridAnalyzer', () => {
  let analyzer;
  let mockGoogleService;
  let mockGroqService;
  let mockQdrantClient;
  let mockEmbeddingService;
  let mockKeywordExtractor;
  
  beforeEach(() => {
    // Setup mocks
    mockGoogleService = {
      checkFacts: jest.fn(),
      getStats: jest.fn(() => ({ requests: 0 }))
    };
    
    mockGroqService = {
      analyzeWithFallback: jest.fn(),
      getStats: jest.fn(() => ({ requests: 0 }))
    };
    
    mockQdrantClient = {
      listCollections: jest.fn(),
      getStats: jest.fn(() => ({ requests: 0 }))
    };
    
    mockEmbeddingService = {
      generateFactCheckEmbedding: jest.fn(),
      searchSimilar: jest.fn(),
      integrateWithQdrant: jest.fn(),
      getStats: jest.fn(() => ({ requests: 0 }))
    };
    
    mockKeywordExtractor = {
      extractForFactCheck: jest.fn()
    };
    
    // Mock constructors
    GoogleFactCheckService.mockImplementation(() => mockGoogleService);
    GroqLLMService.mockImplementation(() => mockGroqService);
    QdrantClient.mockImplementation(() => mockQdrantClient);
    EmbeddingService.mockImplementation(() => mockEmbeddingService);
    KeywordExtractor.mockImplementation(() => mockKeywordExtractor);
    
    analyzer = new HybridAnalyzer({
      googleApiKey: 'test-google-key',
      groqApiKey: 'test-groq-key',
      defaultStrategy: 'comprehensive'
    });
    
    // Limpar mocks
    jest.clearAllMocks();
  });
  
  describe('Inicialização', () => {
    test('deve criar instância com configurações padrão', () => {
      const defaultAnalyzer = new HybridAnalyzer();
      
      expect(defaultAnalyzer).toBeInstanceOf(HybridAnalyzer);
      expect(defaultAnalyzer.options.defaultStrategy).toBe('comprehensive');
      expect(defaultAnalyzer.options.fallbackEnabled).toBe(true);
      expect(defaultAnalyzer.options.cacheEnabled).toBe(true);
    });
    
    test('deve aceitar configurações customizadas', () => {
      const customAnalyzer = new HybridAnalyzer({
        defaultStrategy: 'fast',
        fallbackEnabled: false,
        highConfidenceThreshold: 0.9,
        googleApiWeight: 0.5,
        llmAnalysisWeight: 0.3,
        vectorSearchWeight: 0.2
      });
      
      expect(customAnalyzer.options.defaultStrategy).toBe('fast');
      expect(customAnalyzer.options.fallbackEnabled).toBe(false);
      expect(customAnalyzer.options.highConfidenceThreshold).toBe(0.9);
      expect(customAnalyzer.options.googleApiWeight).toBe(0.5);
    });
    
    test('deve integrar serviços corretamente', () => {
      expect(mockEmbeddingService.integrateWithQdrant).toHaveBeenCalledWith(mockQdrantClient);
    });
  });
  
  describe('Análise rápida', () => {
    test('deve executar análise rápida com sucesso', async () => {
      // Setup mocks
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1', 'keyword2']);
      mockGoogleService.checkFacts.mockResolvedValue({
        success: true,
        found: true,
        claims: [{ text: 'claim1' }],
        summary: { verified: 2, disputed: 0, total: 2 }
      });
      
      const result = await analyzer.analyze('Texto para análise rápida', { strategy: 'fast' });
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('fast');
      expect(result.classification).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.overallConfidence).toBeDefined();
      expect(result.processingComponents).toContain('google_api');
      
      expect(mockKeywordExtractor.extractForFactCheck).toHaveBeenCalledWith('Texto para análise rápida');
      expect(mockGoogleService.checkFacts).toHaveBeenCalled();
    });
    
    test('deve lidar com falha do Google API na análise rápida', async () => {
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1']);
      mockGoogleService.checkFacts.mockResolvedValue({
        success: false,
        found: false
      });
      
      const result = await analyzer.analyze('Texto sem resultados', { strategy: 'fast' });
      
      expect(result.success).toBe(true);
      expect(result.classification).toBe('no_data');
      expect(result.overallConfidence).toBeLessThan(0.5);
    });
  });
  
  describe('Análise abrangente', () => {
    test('deve executar análise abrangente com todos os serviços', async () => {
      // Setup mocks
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1', 'keyword2']);
      
      mockGoogleService.checkFacts.mockResolvedValue({
        success: true,
        found: true,
        claims: [{ text: 'claim1' }],
        summary: { verified: 1, disputed: 0, total: 1 }
      });
      
      mockGroqService.analyzeWithFallback.mockResolvedValue({
        success: true,
        structuredData: {
          classificacao_geral: 'VERIFICADO',
          confianca_geral: 85
        },
        fallbackUsed: false
      });
      
      mockEmbeddingService.generateFactCheckEmbedding.mockResolvedValue({
        success: true,
        embedding: [0.1, 0.2, 0.3],
        dimensions: 3
      });
      
      const result = await analyzer.analyze('Texto para análise abrangente');
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('comprehensive');
      expect(result.sources).toContain('google_api');
      expect(result.sources).toContain('llm_analysis');
      expect(result.sources).toContain('embedding');
      expect(result.processingComponents).toHaveLength(4);
      
      expect(mockGoogleService.checkFacts).toHaveBeenCalled();
      expect(mockGroqService.analyzeWithFallback).toHaveBeenCalled();
      expect(mockEmbeddingService.generateFactCheckEmbedding).toHaveBeenCalled();
    });
    
    test('deve lidar com falhas parciais na análise abrangente', async () => {
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1']);
      
      mockGoogleService.checkFacts.mockResolvedValue({
        success: true,
        found: true,
        summary: { verified: 1, total: 1 }
      });
      
      mockGroqService.analyzeWithFallback.mockRejectedValue(new Error('LLM service failed'));
      
      mockEmbeddingService.generateFactCheckEmbedding.mockResolvedValue({
        success: true,
        embedding: [0.1, 0.2, 0.3]
      });
      
      const result = await analyzer.analyze('Texto com falha parcial');
      
      expect(result.success).toBe(true);
      expect(result.sources).toContain('google_api');
      expect(result.sources).toContain('embedding');
      expect(result.sources).not.toContain('llm_analysis');
      expect(result.components.llm.success).toBe(false);
    });
  });
  
  describe('Análise profunda', () => {
    test('deve executar análise profunda com busca vetorial', async () => {
      // Setup mocks para análise abrangente
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1']);
      mockGoogleService.checkFacts.mockResolvedValue({
        success: true,
        found: true,
        summary: { verified: 1, total: 1 }
      });
      mockGroqService.analyzeWithFallback.mockResolvedValue({
        success: true,
        structuredData: { classificacao_geral: 'VERIFICADO' }
      });
      mockEmbeddingService.generateFactCheckEmbedding.mockResolvedValue({
        success: true,
        embedding: [0.1, 0.2, 0.3]
      });
      
      // Setup mocks para busca vetorial
      mockQdrantClient.listCollections.mockResolvedValue([
        { name: 'fact_check_embeddings' }
      ]);
      mockEmbeddingService.searchSimilar.mockResolvedValue({
        success: true,
        results: [
          { similarity: 0.85, text: 'Similar fact' },
          { similarity: 0.75, text: 'Another similar fact' }
        ]
      });
      
      const result = await analyzer.analyze('Texto para análise profunda', { strategy: 'deep' });
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('deep');
      expect(result.sources).toContain('vector_search');
      expect(result.processingComponents).toContain('vector_search');
      
      expect(mockQdrantClient.listCollections).toHaveBeenCalled();
      expect(mockEmbeddingService.searchSimilar).toHaveBeenCalled();
    });
    
    test('deve lidar com coleção vetorial inexistente', async () => {
      // Setup mocks básicos
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1']);
      mockGoogleService.checkFacts.mockResolvedValue({ success: true, found: false });
      mockGroqService.analyzeWithFallback.mockResolvedValue({ success: true });
      mockEmbeddingService.generateFactCheckEmbedding.mockResolvedValue({ success: true });
      
      // Coleção não existe
      mockQdrantClient.listCollections.mockResolvedValue([]);
      
      const result = await analyzer.analyze('Texto sem coleção vetorial', { strategy: 'deep' });
      
      expect(result.success).toBe(true);
      expect(result.components.vectorSearch.success).toBe(false);
      expect(result.components.vectorSearch.message).toContain('não encontrada');
    });
  });
  
  describe('Análise customizada', () => {
    test('deve executar análise customizada com configurações específicas', async () => {
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1']);
      mockGoogleService.checkFacts.mockResolvedValue({
        success: true,
        found: true,
        summary: { verified: 1, total: 1 }
      });
      
      const customConfig = {
        useGoogle: true,
        useLLM: false,
        useEmbedding: true,
        useVectorSearch: false
      };
      
      const result = await analyzer.analyze('Texto customizado', {
        strategy: 'custom',
        customConfig: customConfig
      });
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('custom');
      expect(result.customConfig).toEqual(customConfig);
      
      expect(mockGoogleService.checkFacts).toHaveBeenCalled();
      expect(mockGroqService.analyzeWithFallback).not.toHaveBeenCalled();
    });
  });
  
  describe('Sistema de cache', () => {
    test('deve usar cache para análises repetidas', async () => {
      mockKeywordExtractor.extractForFactCheck.mockReturnValue(['keyword1']);
      mockGoogleService.checkFacts.mockResolvedValue({
        success: true,
        found: true,
        summary: { verified: 1, total: 1 }
      });
      
      const text = 'Texto para teste de cache';
      
      // Primeira análise
      const result1 = await analyzer.analyze(text, { strategy: 'fast' });
      expect(result1.cached).toBe(false);
      expect(mockGoogleService.checkFacts).toHaveBeenCalledTimes(1);
      
      // Segunda análise (deve usar cache)
      const result2 = await analyzer.analyze(text, { strategy: 'fast' });
      expect(result2.cached).toBe(true);
      expect(mockGoogleService.checkFacts).toHaveBeenCalledTimes(1); // Não deve chamar novamente
    });
    
    test('deve fornecer estatísticas do cache', () => {
      const cacheStats = analyzer.getCacheStats();
      
      expect(cacheStats.totalEntries).toBeDefined();
      expect(cacheStats.expiredEntries).toBeDefined();
      expect(cacheStats.validEntries).toBeDefined();
      expect(cacheStats.cacheExpiry).toBeDefined();
    });
    
    test('deve limpar cache', () => {
      analyzer.unifiedCache.set('test', { result: {}, timestamp: Date.now() });
      expect(analyzer.unifiedCache.size).toBe(1);
      
      analyzer.clearCache();
      expect(analyzer.unifiedCache.size).toBe(0);
    });
  });
  
  describe('Geração de relatórios', () => {
    test('deve gerar relatório detalhado', () => {
      const mockAnalysisResult = {
        analysisId: 'test-analysis-123',
        strategy: 'comprehensive',
        classification: 'verified',
        overallConfidence: 0.85,
        overallScore: 85,
        sources: ['google_api', 'llm_analysis'],
        evidences: [
          { source: 'google_api', confidence: 0.8, score: 80 },
          { source: 'llm_analysis', confidence: 0.9, score: 90 }
        ],
        recommendations: [
          { type: 'verification', priority: 'high', message: 'Test recommendation' }
        ],
        nextSteps: [
          { action: 'manual_verification', priority: 'medium' }
        ],
        components: {
          google: { success: true, found: true },
          llm: { success: true, model: 'test-model' }
        },
        processingTime: 1500,
        cached: false
      };
      
      const report = analyzer.generateDetailedReport(mockAnalysisResult);
      
      expect(report.metadata).toBeDefined();
      expect(report.executive).toBeDefined();
      expect(report.analysis).toBeDefined();
      expect(report.evidence).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.technical).toBeDefined();
      
      expect(report.executive.verdict.classification).toBe('VERIFICADO');
      expect(report.evidence.summary.totalEvidences).toBe(2);
      expect(report.recommendations.immediate).toHaveLength(1);
    });
    
    test('deve gerar relatório resumido', () => {
      const mockAnalysisResult = {
        analysisId: 'test-summary-123',
        classification: 'verified',
        overallConfidence: 0.85,
        summary: { text: 'Test summary' },
        recommendations: [
          { priority: 'high', message: 'High priority rec' },
          { priority: 'medium', message: 'Medium priority rec' }
        ],
        processingTime: 1000
      };
      
      const report = analyzer.generateDetailedReport(mockAnalysisResult, { format: 'summary' });
      
      expect(report.metadata).toBeDefined();
      expect(report.summary).toBe('Test summary');
      expect(report.confidence).toBe('high');
      expect(report.keyRecommendations).toHaveLength(1);
      expect(report.processingTime).toBe(1000);
    });
  });
  
  describe('Tratamento de erros', () => {
    test('deve rejeitar entrada inválida', async () => {
      const result1 = await analyzer.analyze('');
      expect(result1.success).toBe(false);
      
      const result2 = await analyzer.analyze('ab'); // Muito curto
      expect(result2.success).toBe(false);
      
      const result3 = await analyzer.analyze('a'.repeat(11000)); // Muito longo
      expect(result3.success).toBe(false);
    });
    
    test('deve lidar com falha geral na análise', async () => {
      mockKeywordExtractor.extractForFactCheck.mockImplementation(() => {
        throw new Error('Keyword extraction failed');
      });
      
      const result = await analyzer.analyze('Texto que causará erro');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Keyword extraction failed');
    });
  });
  
  describe('Estatísticas', () => {
    test('deve fornecer estatísticas completas', () => {
      const stats = analyzer.getStats();
      
      expect(stats.analyzer).toBeDefined();
      expect(stats.services).toBeDefined();
      expect(stats.config).toBeDefined();
      
      expect(stats.analyzer.totalAnalyses).toBeDefined();
      expect(stats.analyzer.successRate).toBeDefined();
      expect(stats.config.defaultStrategy).toBe('comprehensive');
    });
  });
});
