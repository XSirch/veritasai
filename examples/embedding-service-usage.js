/**
 * Exemplo de uso do EmbeddingService
 * Demonstra geração de embeddings, cache e integração com Qdrant
 */

const EmbeddingService = require('../src/services/embedding-service');
const QdrantClient = require('../src/services/qdrant-client');

/**
 * Exemplo básico de geração de embeddings
 */
async function basicEmbeddingExample() {
  console.log('=== Exemplo Básico de Embeddings ===\n');
  
  const embeddingService = new EmbeddingService({
    defaultModel: 'Xenova/all-MiniLM-L6-v2',
    cacheEnabled: true,
    batchSize: 8
  });
  
  try {
    // Gerar embedding para um texto
    console.log('Gerando embedding para texto único...');
    const result = await embeddingService.generateEmbedding(
      'O aquecimento global é um fenômeno científico comprovado.'
    );
    
    console.log('Resultado:');
    console.log('- Sucesso:', result.success);
    console.log('- Dimensões:', result.dimensions);
    console.log('- Modelo:', result.model);
    console.log('- Tempo de processamento:', result.processingTime, 'ms');
    console.log('- Embedding (primeiros 5 valores):', result.embedding.slice(0, 5));
    
    // Gerar embedding para múltiplos textos
    console.log('\nGerando embeddings para múltiplos textos...');
    const texts = [
      'A Terra é redonda.',
      'Vacinas são seguras e eficazes.',
      'O céu é azul durante o dia.',
      'A água ferve a 100°C ao nível do mar.'
    ];
    
    const batchResult = await embeddingService.generateEmbeddings(texts);
    
    console.log('Resultado do lote:');
    console.log('- Sucesso:', batchResult.success);
    console.log('- Total de textos:', batchResult.totalTexts);
    console.log('- Cache hits:', batchResult.cacheHits);
    console.log('- Textos processados:', batchResult.processedTexts);
    console.log('- Tempo de processamento:', batchResult.processingTime, 'ms');
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

/**
 * Exemplo de embeddings especializados
 */
async function specializedEmbeddingsExample() {
  console.log('\n=== Exemplo de Embeddings Especializados ===\n');
  
  const embeddingService = new EmbeddingService({
    defaultModel: 'Xenova/all-mpnet-base-v2',
    cacheEnabled: true
  });
  
  try {
    // Embedding para fact-checking
    console.log('Gerando embedding para fact-checking...');
    const factCheckResult = await embeddingService.generateFactCheckEmbedding(
      'Segundo estudos recentes, 95% dos cientistas concordam que as mudanças climáticas são causadas pela atividade humana.'
    );
    
    console.log('Fact-check embedding:');
    console.log('- Tipo:', factCheckResult.type);
    console.log('- Dimensões:', factCheckResult.dimensions);
    console.log('- Texto original:', factCheckResult.originalText.substring(0, 50) + '...');
    console.log('- Texto processado:', factCheckResult.processedText.substring(0, 50) + '...');
    
    // Embedding para busca
    console.log('\nGerando embedding para busca...');
    const searchResult = await embeddingService.generateSearchEmbedding(
      'mudanças climáticas aquecimento global'
    );
    
    console.log('Search embedding:');
    console.log('- Tipo:', searchResult.type);
    console.log('- Query original:', searchResult.originalQuery);
    console.log('- Query processada:', searchResult.processedQuery);
    
    // Embeddings para documentos
    console.log('\nGerando embeddings para documentos...');
    const documents = [
      `O aquecimento global refere-se ao aumento da temperatura média da Terra devido às atividades humanas. 
       Este fenômeno tem sido observado desde a Revolução Industrial e está acelerando nas últimas décadas.`,
      
      `As vacinas são uma das maiores conquistas da medicina moderna. Elas funcionam treinando o sistema 
       imunológico para reconhecer e combater patógenos específicos, prevenindo doenças graves.`,
       
      `A inteligência artificial está transformando diversos setores da economia. Desde diagnósticos médicos 
       até veículos autônomos, a IA promete revolucionar como vivemos e trabalhamos.`
    ];
    
    const docResult = await embeddingService.generateDocumentEmbeddings(documents);
    
    console.log('Document embeddings:');
    console.log('- Tipo:', docResult.type);
    console.log('- Total de documentos:', docResult.totalTexts);
    console.log('- Documentos processados:', docResult.processedTexts);
    
    docResult.embeddings.forEach((embedding, index) => {
      console.log(`  Documento ${index + 1}:`);
      console.log(`    - Palavras: ${embedding.wordCount}`);
      console.log(`    - Caracteres: ${embedding.documentLength}`);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

/**
 * Exemplo de cálculo de similaridade
 */
async function similarityExample() {
  console.log('\n=== Exemplo de Cálculo de Similaridade ===\n');
  
  const embeddingService = new EmbeddingService();
  
  try {
    // Gerar embeddings para textos relacionados
    const texts = [
      'O aquecimento global é causado pelas atividades humanas.',
      'As mudanças climáticas são resultado da ação do homem.',
      'Vacinas previnem doenças infecciosas.',
      'A imunização protege contra patógenos.'
    ];
    
    console.log('Gerando embeddings para análise de similaridade...');
    const result = await embeddingService.generateEmbeddings(texts);
    
    if (result.success) {
      const embeddings = result.embeddings.map(e => e.embedding);
      
      console.log('\nCalculando similaridades:');
      
      // Comparar textos sobre clima
      const similarity1 = embeddingService.calculateSimilarity(
        embeddings[0], embeddings[1], 'cosine'
      );
      console.log(`Clima 1 vs Clima 2: ${similarity1.toFixed(4)}`);
      
      // Comparar textos sobre vacinas
      const similarity2 = embeddingService.calculateSimilarity(
        embeddings[2], embeddings[3], 'cosine'
      );
      console.log(`Vacina 1 vs Vacina 2: ${similarity2.toFixed(4)}`);
      
      // Comparar temas diferentes
      const similarity3 = embeddingService.calculateSimilarity(
        embeddings[0], embeddings[2], 'cosine'
      );
      console.log(`Clima vs Vacina: ${similarity3.toFixed(4)}`);
      
      // Encontrar mais similares
      console.log('\nEncontrando textos mais similares ao primeiro:');
      const candidates = result.embeddings.slice(1).map((emb, index) => ({
        embedding: emb.embedding,
        text: texts[index + 1],
        index: index + 1
      }));
      
      const mostSimilar = embeddingService.findMostSimilar(
        embeddings[0], candidates, { limit: 3, threshold: 0.3 }
      );
      
      mostSimilar.forEach((match, index) => {
        console.log(`${index + 1}. Similaridade: ${match.similarity.toFixed(4)} - "${match.text}"`);
      });
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

/**
 * Exemplo de integração com Qdrant
 */
async function qdrantIntegrationExample() {
  console.log('\n=== Exemplo de Integração com Qdrant ===\n');
  
  const embeddingService = new EmbeddingService({
    defaultModel: 'Xenova/all-MiniLM-L6-v2'
  });
  
  const qdrantClient = new QdrantClient({
    host: 'localhost',
    port: 6333
  });
  
  try {
    // Integrar serviços
    embeddingService.integrateWithQdrant(qdrantClient);
    
    // Verificar conexão com Qdrant
    console.log('Verificando conexão com Qdrant...');
    const health = await qdrantClient.healthCheck();
    
    if (!health.healthy) {
      console.log('⚠️  Qdrant não está disponível. Pulando exemplo de integração.');
      return;
    }
    
    console.log('✅ Qdrant conectado!');
    
    // Criar coleção para embeddings
    const collectionName = 'fact_check_embeddings';
    console.log(`\nCriando coleção: ${collectionName}`);
    
    try {
      await embeddingService.createEmbeddingCollection(collectionName, {
        model: 'Xenova/all-MiniLM-L6-v2',
        distance: 'Cosine'
      });
      console.log('✅ Coleção criada!');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Coleção já existe, continuando...');
      } else {
        throw error;
      }
    }
    
    // Gerar e armazenar embeddings
    console.log('\nGerando e armazenando embeddings...');
    const factTexts = [
      'A Terra tem aproximadamente 4.5 bilhões de anos.',
      'A velocidade da luz no vácuo é 299.792.458 metros por segundo.',
      'O DNA humano contém cerca de 3 bilhões de pares de bases.',
      'A temperatura média da Terra aumentou 1.1°C desde 1880.'
    ];
    
    const storeResult = await embeddingService.generateAndStoreBatch(factTexts, {
      collection: collectionName,
      startId: Date.now(),
      payload: {
        category: 'scientific_facts',
        verified: true,
        source: 'example'
      }
    });
    
    console.log('Armazenamento:');
    console.log('- Sucesso:', storeResult.success);
    console.log('- Pontos armazenados:', storeResult.pointsStored);
    
    // Buscar por similaridade
    console.log('\nBuscando fatos similares...');
    const searchQuery = 'idade da Terra planeta formação';
    
    const searchResult = await embeddingService.searchSimilar(searchQuery, {
      collection: collectionName,
      limit: 3,
      scoreThreshold: 0.5
    });
    
    console.log('Resultados da busca:');
    console.log('- Query:', searchResult.query);
    console.log('- Total de resultados:', searchResult.totalResults);
    
    searchResult.results.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.similarity.toFixed(4)} - "${result.text}"`);
    });
    
  } catch (error) {
    console.error('Erro na integração com Qdrant:', error.message);
  }
}

/**
 * Exemplo de cache e performance
 */
async function cacheAndPerformanceExample() {
  console.log('\n=== Exemplo de Cache e Performance ===\n');
  
  const embeddingService = new EmbeddingService({
    cacheEnabled: true,
    batchSize: 4
  });
  
  try {
    const testText = 'Este é um texto para testar o sistema de cache.';
    
    // Primeira geração (sem cache)
    console.log('Primeira geração (sem cache):');
    const start1 = Date.now();
    const result1 = await embeddingService.generateEmbedding(testText);
    const time1 = Date.now() - start1;
    
    console.log(`- Tempo: ${time1}ms`);
    console.log(`- Cached: ${result1.cached}`);
    console.log(`- Source: ${result1.source}`);
    
    // Segunda geração (com cache)
    console.log('\nSegunda geração (com cache):');
    const start2 = Date.now();
    const result2 = await embeddingService.generateEmbedding(testText);
    const time2 = Date.now() - start2;
    
    console.log(`- Tempo: ${time2}ms`);
    console.log(`- Cached: ${result2.cached}`);
    console.log(`- Source: ${result2.source}`);
    console.log(`- Speedup: ${(time1 / time2).toFixed(2)}x`);
    
    // Estatísticas do cache
    console.log('\nEstatísticas do cache:');
    const cacheStats = embeddingService.getCacheStats();
    console.log(`- Total de entradas: ${cacheStats.totalEntries}`);
    console.log(`- Entradas válidas: ${cacheStats.validEntries}`);
    console.log(`- Hit rate: ${cacheStats.hitRate}%`);
    console.log(`- Tamanho estimado: ${cacheStats.estimatedSizeMB} MB`);
    
    // Estatísticas gerais
    console.log('\nEstatísticas gerais:');
    const stats = embeddingService.getStats();
    console.log(`- Total de requests: ${stats.performance.totalRequests}`);
    console.log(`- Total de textos: ${stats.performance.totalTexts}`);
    console.log(`- Tempo médio: ${stats.performance.averageProcessingTime}ms`);
    console.log(`- Cache hits: ${stats.cache.hits}`);
    console.log(`- Cache misses: ${stats.cache.misses}`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🧠 VeritasAI - Exemplos de EmbeddingService\n');
  
  try {
    await basicEmbeddingExample();
    await specializedEmbeddingsExample();
    await similarityExample();
    await qdrantIntegrationExample();
    await cacheAndPerformanceExample();
    
    console.log('\n✅ Todos os exemplos executados com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  basicEmbeddingExample,
  specializedEmbeddingsExample,
  similarityExample,
  qdrantIntegrationExample,
  cacheAndPerformanceExample
};
