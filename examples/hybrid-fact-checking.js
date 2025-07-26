/**
 * Exemplo de uso do sistema híbrido de fact-checking
 * Demonstra integração entre GoogleFactCheckService e GroqLLMService
 */

const FactCheckOrchestrator = require('../src/services/fact-check-orchestrator');
const GoogleFactCheckService = require('../src/services/google-fact-check-service');
const GroqLLMService = require('../src/services/groq-llm-service');

/**
 * Exemplo básico de verificação híbrida
 */
async function basicHybridExample() {
  console.log('=== Exemplo Básico de Fact-Checking Híbrido ===\n');
  
  // Inicializar orquestrador
  const orchestrator = new FactCheckOrchestrator({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    preferredStrategy: 'hybrid',
    fallbackEnabled: true,
    llmAsBackup: true
  });
  
  const testText = 'O presidente Joe Biden afirmou que 95% dos americanos foram vacinados contra COVID-19.';
  
  try {
    console.log('Texto para verificação:', testText);
    console.log('\nExecutando verificação híbrida...\n');
    
    const result = await orchestrator.checkFacts(testText);
    
    console.log('Resultado da verificação:');
    console.log('- Sucesso:', result.success);
    console.log('- Estratégia usada:', result.strategy);
    console.log('- Classificação:', result.classification || 'N/A');
    console.log('- Confiança:', result.confidence || 'N/A');
    
    if (result.googleResult) {
      console.log('\nResultados do Google:');
      console.log('- Claims encontrados:', result.googleResult.claims.length);
      console.log('- Fontes:', result.googleResult.summary?.total || 0);
    }
    
    if (result.llmResult) {
      console.log('\nResultados do LLM:');
      console.log('- Modelo usado:', result.llmResult.model);
      console.log('- Análise disponível:', !!result.llmResult.analysis);
    }
    
    if (result.recommendations) {
      console.log('\nRecomendações:');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.level}] ${rec.message}`);
      });
    }
    
  } catch (error) {
    console.error('Erro na verificação:', error.message);
  }
}

/**
 * Exemplo de diferentes estratégias
 */
async function strategiesExample() {
  console.log('\n=== Exemplo de Diferentes Estratégias ===\n');
  
  const orchestrator = new FactCheckOrchestrator({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY
  });
  
  const testText = 'A Terra é plana e isso foi provado por cientistas independentes.';
  
  const strategies = ['google_only', 'llm_only', 'hybrid', 'parallel'];
  
  for (const strategy of strategies) {
    try {
      console.log(`\n--- Estratégia: ${strategy} ---`);
      
      const result = await orchestrator.checkFacts(testText, { strategy });
      
      console.log('Resultado:', result.success ? 'Sucesso' : 'Falha');
      console.log('Classificação:', result.classification || 'N/A');
      console.log('Tempo de processamento:', result.processingMetadata?.processingTime || 'N/A', 'ms');
      
      if (result.fallbackUsed) {
        console.log('⚠️  Fallback usado:', result.fallbackReason);
      }
      
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }
  }
}

/**
 * Exemplo de monitoramento de performance
 */
async function performanceExample() {
  console.log('\n=== Exemplo de Monitoramento de Performance ===\n');
  
  const orchestrator = new FactCheckOrchestrator({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    preferredStrategy: 'hybrid'
  });
  
  // Fazer várias verificações para coletar estatísticas
  const testTexts = [
    'COVID-19 vaccines are safe and effective.',
    'Climate change is caused by human activities.',
    'The 2020 US election was rigged.',
    'Drinking water prevents dehydration.',
    'The moon landing was faked in a studio.'
  ];
  
  console.log('Executando múltiplas verificações...\n');
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    console.log(`${i + 1}. Verificando: "${text.substring(0, 50)}..."`);
    
    try {
      const startTime = Date.now();
      const result = await orchestrator.checkFacts(text);
      const endTime = Date.now();
      
      console.log(`   ✅ Concluído em ${endTime - startTime}ms - Estratégia: ${result.strategy}`);
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
  
  // Mostrar estatísticas finais
  console.log('\n--- Estatísticas Finais ---');
  const stats = orchestrator.getStats();
  
  console.log('Orquestrador:');
  console.log('- Total de requests:', stats.orchestrator.totalRequests);
  console.log('- Taxa de sucesso:', stats.orchestrator.successRate);
  console.log('- Uso do Google API:', stats.orchestrator.googleApiUsage);
  console.log('- Uso do Groq API:', stats.orchestrator.groqApiUsage);
  console.log('- Fallbacks usados:', stats.orchestrator.fallbacksUsed);
  console.log('- Tempo médio:', stats.orchestrator.averageProcessingTime, 'ms');
  
  if (stats.services.groq.costs.enabled !== false) {
    console.log('\nCustos do LLM:');
    console.log('- Custo total:', '$' + stats.services.groq.costs.summary.totalCost);
    console.log('- Requests:', stats.services.groq.costs.summary.totalRequests);
    console.log('- Tokens usados:', stats.services.groq.costs.summary.totalTokens);
  }
}

/**
 * Exemplo de configuração avançada
 */
async function advancedConfigExample() {
  console.log('\n=== Exemplo de Configuração Avançada ===\n');
  
  const orchestrator = new FactCheckOrchestrator({
    // APIs
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    
    // Estratégia
    preferredStrategy: 'hybrid',
    fallbackEnabled: true,
    llmAsBackup: true,
    confidenceThreshold: 0.8,
    
    // Performance
    maxConcurrentRequests: 2,
    timeout: 15000,
    
    // Cache
    cacheEnabled: true,
    
    // Rate limiting
    rateLimitEnabled: true,
    
    // Cost tracking
    costTrackingEnabled: true,
    
    // Configurações específicas do Google
    googleOptions: {
      maxResults: 5,
      retryAttempts: 2
    },
    
    // Configurações específicas do Groq
    groqOptions: {
      defaultModel: 'mixtral-8x7b-32768',
      temperature: 0.1,
      maxTokens: 1024,
      budgetLimit: 5.00 // USD
    },
    
    // Configurações do extrator
    extractorOptions: {
      maxKeywords: 6,
      language: 'pt'
    }
  });
  
  const complexText = `
    Segundo um estudo recente publicado na revista Nature, 
    cientistas descobriram que 87% das pessoas que tomaram 
    a vacina contra COVID-19 desenvolveram imunidade duradoura. 
    O estudo foi conduzido com 10.000 participantes ao longo 
    de 18 meses e mostrou eficácia superior a 95% na prevenção 
    de hospitalizações.
  `;
  
  console.log('Verificando texto complexo com configuração avançada...\n');
  
  try {
    const result = await orchestrator.checkFacts(complexText);
    
    console.log('Resultado detalhado:');
    console.log(JSON.stringify({
      success: result.success,
      strategy: result.strategy,
      classification: result.classification,
      confidence: result.confidence,
      keywordsUsed: result.keywordsUsed,
      sourcesCount: result.combinedAnalysis?.sourcesCount,
      processingTime: result.processingMetadata?.processingTime,
      servicesUsed: result.processingMetadata?.servicesUsed
    }, null, 2));
    
  } catch (error) {
    console.error('Erro na verificação avançada:', error.message);
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🔍 VeritasAI - Exemplos de Fact-Checking Híbrido\n');
  
  // Verificar se as API keys estão configuradas
  if (!process.env.GOOGLE_FACT_CHECK_API_KEY && !process.env.GROQ_API_KEY) {
    console.log('⚠️  Aviso: API keys não configuradas. Alguns exemplos podem falhar.');
    console.log('Configure GOOGLE_FACT_CHECK_API_KEY e/ou GROQ_API_KEY para testar completamente.\n');
  }
  
  try {
    await basicHybridExample();
    await strategiesExample();
    await performanceExample();
    await advancedConfigExample();
    
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
  basicHybridExample,
  strategiesExample,
  performanceExample,
  advancedConfigExample
};
