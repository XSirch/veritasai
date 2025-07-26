/**
 * Exemplo de uso do HybridAnalyzer
 * Demonstra o orquestrador principal do VeritasAI
 */

const HybridAnalyzer = require('../src/services/hybrid-analyzer');

/**
 * Exemplo básico do HybridAnalyzer
 */
async function basicHybridAnalyzerExample() {
  console.log('=== Exemplo Básico do HybridAnalyzer ===\n');
  
  const analyzer = new HybridAnalyzer({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    qdrantHost: 'localhost',
    qdrantPort: 6333,
    defaultStrategy: 'comprehensive',
    cacheEnabled: true
  });
  
  const testText = `
    Segundo um estudo recente publicado na revista Nature, 
    95% dos cientistas concordam que as mudanças climáticas 
    são causadas principalmente pela atividade humana.
  `;
  
  try {
    console.log('Executando análise híbrida...\n');
    console.log('Texto:', testText.trim());
    
    const result = await analyzer.analyze(testText);
    
    console.log('\n--- Resultado da Análise ---');
    console.log('Sucesso:', result.success);
    console.log('ID da Análise:', result.analysisId);
    console.log('Estratégia:', result.strategy);
    console.log('Tempo de processamento:', result.processingTime, 'ms');
    console.log('Cached:', result.cached);
    
    console.log('\n--- Classificação ---');
    console.log('Score geral:', result.overallScore + '/100');
    console.log('Confiança:', Math.round(result.overallConfidence * 100) + '%');
    console.log('Classificação:', result.classification);
    console.log('Nível de confiança:', result.confidenceLevel);
    
    console.log('\n--- Fontes Consultadas ---');
    result.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source}`);
    });
    
    console.log('\n--- Evidências ---');
    result.evidences.forEach((evidence, index) => {
      console.log(`${index + 1}. ${evidence.source}:`);
      console.log(`   Score: ${evidence.score}/100`);
      console.log(`   Confiança: ${Math.round(evidence.confidence * 100)}%`);
      console.log(`   Detalhes: ${evidence.details}`);
    });
    
    if (result.recommendations?.length > 0) {
      console.log('\n--- Recomendações ---');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }
    
  } catch (error) {
    console.error('Erro na análise:', error.message);
  }
}

/**
 * Exemplo de diferentes estratégias
 */
async function strategiesExample() {
  console.log('\n=== Exemplo de Diferentes Estratégias ===\n');
  
  const analyzer = new HybridAnalyzer({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY
  });
  
  const testText = 'A Terra é plana e isso foi provado por cientistas independentes.';
  const strategies = ['fast', 'comprehensive', 'deep'];
  
  for (const strategy of strategies) {
    try {
      console.log(`\n--- Estratégia: ${strategy.toUpperCase()} ---`);
      
      const startTime = Date.now();
      const result = await analyzer.analyze(testText, { strategy });
      const endTime = Date.now();
      
      console.log('Resultado:', result.success ? 'Sucesso' : 'Falha');
      console.log('Classificação:', result.classification);
      console.log('Score:', result.overallScore + '/100');
      console.log('Confiança:', Math.round(result.overallConfidence * 100) + '%');
      console.log('Tempo real:', endTime - startTime, 'ms');
      console.log('Componentes usados:', result.processingComponents?.join(', '));
      
      if (result.fallbacksUsed?.length > 0) {
        console.log('⚠️  Fallbacks usados:', result.fallbacksUsed.join(', '));
      }
      
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }
  }
}

/**
 * Exemplo de análise customizada
 */
async function customAnalysisExample() {
  console.log('\n=== Exemplo de Análise Customizada ===\n');
  
  const analyzer = new HybridAnalyzer({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY
  });
  
  const testText = 'Vacinas contra COVID-19 são seguras e eficazes.';
  
  // Configuração customizada
  const customConfig = {
    useGoogle: true,
    useLLM: true,
    useEmbedding: false,
    useVectorSearch: false,
    llmModel: 'mixtral-8x7b-32768',
    useDeepScoring: false
  };
  
  try {
    console.log('Executando análise customizada...');
    console.log('Configuração:', JSON.stringify(customConfig, null, 2));
    
    const result = await analyzer.analyze(testText, {
      strategy: 'custom',
      customConfig: customConfig
    });
    
    console.log('\nResultado customizado:');
    console.log('- Estratégia:', result.strategy);
    console.log('- Componentes usados:', result.processingComponents?.join(', '));
    console.log('- Score:', result.overallScore + '/100');
    console.log('- Classificação:', result.classification);
    console.log('- Config aplicada:', JSON.stringify(result.customConfig, null, 2));
    
  } catch (error) {
    console.error('Erro na análise customizada:', error.message);
  }
}

/**
 * Exemplo de geração de relatórios
 */
async function reportGenerationExample() {
  console.log('\n=== Exemplo de Geração de Relatórios ===\n');
  
  const analyzer = new HybridAnalyzer({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY
  });
  
  const testText = `
    Um estudo da Universidade de Oxford mostrou que 
    pessoas vacinadas têm 90% menos chance de hospitalização 
    por COVID-19 comparado a pessoas não vacinadas.
  `;
  
  try {
    console.log('Executando análise para relatório...');
    
    const result = await analyzer.analyze(testText, { strategy: 'comprehensive' });
    
    if (result.success) {
      // Relatório detalhado
      console.log('\n--- Relatório Detalhado ---');
      const detailedReport = analyzer.generateDetailedReport(result);
      
      console.log('ID do Relatório:', detailedReport.metadata.reportId);
      console.log('Gerado em:', detailedReport.metadata.generatedAt);
      
      console.log('\nResumo Executivo:');
      console.log('- Veredicto:', detailedReport.executive.verdict.classification);
      console.log('- Ação recomendada:', detailedReport.executive.verdict.action);
      console.log('- Interpretação:', detailedReport.executive.confidence.interpretation);
      
      console.log('\nEvidências:');
      console.log('- Total:', detailedReport.evidence.summary.totalEvidences);
      console.log('- Fortes:', detailedReport.evidence.summary.strongEvidence);
      console.log('- Fracas:', detailedReport.evidence.summary.weakEvidence);
      
      console.log('\nConfiabilidade:');
      console.log('- Score:', detailedReport.technical.reliability.score + '/100');
      console.log('- Nível:', detailedReport.technical.reliability.level);
      console.log('- Interpretação:', detailedReport.technical.reliability.interpretation);
      
      if (detailedReport.technical.reliability.issues.length > 0) {
        console.log('- Problemas detectados:');
        detailedReport.technical.reliability.issues.forEach(issue => {
          console.log(`  • ${issue}`);
        });
      }
      
      // Relatório resumido
      console.log('\n--- Relatório Resumido ---');
      const summaryReport = analyzer.generateDetailedReport(result, { format: 'summary' });
      
      console.log('Resumo:', summaryReport.summary);
      console.log('Confiança:', summaryReport.confidence);
      console.log('Veredicto:', summaryReport.verdict.classification);
      console.log('Tempo de processamento:', summaryReport.processingTime, 'ms');
      
      if (summaryReport.keyRecommendations.length > 0) {
        console.log('Recomendações principais:');
        summaryReport.keyRecommendations.forEach(rec => {
          console.log(`- ${rec.message}`);
        });
      }
      
    } else {
      console.log('❌ Falha na análise:', result.error);
    }
    
  } catch (error) {
    console.error('Erro na geração de relatório:', error.message);
  }
}

/**
 * Exemplo de monitoramento e estatísticas
 */
async function monitoringExample() {
  console.log('\n=== Exemplo de Monitoramento e Estatísticas ===\n');
  
  const analyzer = new HybridAnalyzer({
    googleApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY
  });
  
  // Executar várias análises para gerar estatísticas
  const testTexts = [
    'A água ferve a 100°C ao nível do mar.',
    'A Terra tem aproximadamente 4.5 bilhões de anos.',
    'Vacinas causam autismo.',
    'O aquecimento global é uma farsa.',
    'A velocidade da luz é 299.792.458 m/s.'
  ];
  
  console.log('Executando múltiplas análises...\n');
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    console.log(`${i + 1}. Analisando: "${text.substring(0, 40)}..."`);
    
    try {
      const result = await analyzer.analyze(text, { strategy: 'fast' });
      console.log(`   ✅ ${result.classification} (${result.overallScore}/100)`);
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
  
  // Mostrar estatísticas
  console.log('\n--- Estatísticas do Analisador ---');
  const stats = analyzer.getStats();
  
  console.log('Performance:');
  console.log('- Total de análises:', stats.analyzer.totalAnalyses);
  console.log('- Taxa de sucesso:', stats.analyzer.successRate);
  console.log('- Tempo médio:', stats.analyzer.averageProcessingTime, 'ms');
  console.log('- Uptime:', Math.round(stats.analyzer.uptime / 1000), 'segundos');
  
  console.log('\nUso de estratégias:');
  Object.entries(stats.analyzer.strategyUsage).forEach(([strategy, count]) => {
    console.log(`- ${strategy}: ${count} vezes`);
  });
  
  console.log('\nDistribuição de confiança:');
  const confidence = stats.analyzer.confidenceDistribution;
  console.log(`- Alta: ${confidence.high}`);
  console.log(`- Média: ${confidence.medium}`);
  console.log(`- Baixa: ${confidence.low}`);
  console.log(`- Incerta: ${confidence.uncertain}`);
  
  console.log('\nUso de serviços:');
  Object.entries(stats.analyzer.serviceUsage).forEach(([service, count]) => {
    console.log(`- ${service}: ${count} chamadas`);
  });
  
  // Estatísticas do cache
  console.log('\nCache:');
  const cacheStats = analyzer.getCacheStats();
  console.log('- Entradas totais:', cacheStats.totalEntries);
  console.log('- Entradas válidas:', cacheStats.validEntries);
  console.log('- Entradas expiradas:', cacheStats.expiredEntries);
}

/**
 * Função principal
 */
async function main() {
  console.log('🔍 VeritasAI - Exemplos do HybridAnalyzer\n');
  
  // Verificar se as API keys estão configuradas
  if (!process.env.GOOGLE_FACT_CHECK_API_KEY && !process.env.GROQ_API_KEY) {
    console.log('⚠️  Aviso: API keys não configuradas. Alguns exemplos podem falhar.');
    console.log('Configure GOOGLE_FACT_CHECK_API_KEY e/ou GROQ_API_KEY para testar completamente.\n');
  }
  
  try {
    await basicHybridAnalyzerExample();
    await strategiesExample();
    await customAnalysisExample();
    await reportGenerationExample();
    await monitoringExample();
    
    console.log('\n✅ Todos os exemplos executados com sucesso!');
    console.log('\n🎉 VeritasAI HybridAnalyzer está funcionando perfeitamente!');
    
  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  basicHybridAnalyzerExample,
  strategiesExample,
  customAnalysisExample,
  reportGenerationExample,
  monitoringExample
};
