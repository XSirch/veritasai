/**
 * TextDetector - Módulo para detecção e análise de texto selecionado
 */

export class TextDetector {
  constructor(config) {
    this.config = config;
  }
  
  /**
   * Extrai texto selecionado com limpeza
   */
  extractSelectedText(selection) {
    if (!selection || selection.rangeCount === 0) return '';
    
    let text = selection.toString().trim();
    
    // Limpeza básica do texto
    text = text.replace(/\s+/g, ' '); // Normalizar espaços
    text = text.replace(/[\r\n\t]/g, ' '); // Remover quebras de linha
    text = text.trim();
    
    return text;
  }
  
  /**
   * Valida se a seleção é adequada para verificação
   */
  isValidSelection(text, selection) {
    if (!text || !selection || selection.rangeCount === 0) return false;
    
    // Verificar comprimento
    if (text.length < this.config.MIN_TEXT_LENGTH || 
        text.length > this.config.MAX_TEXT_LENGTH) {
      return false;
    }
    
    // Verificar se não é apenas números ou símbolos
    if (!/[a-zA-ZÀ-ÿ]/.test(text)) return false;
    
    // Verificar se não está em elementos excluídos
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container;
    
    if (this.isExcludedElement(element)) return false;
    
    // Verificar se não é uma seleção dentro de elementos do VeritasAI
    if (element.closest('#veritas-verify-button, #veritas-tooltip')) return false;
    
    return true;
  }
  
  /**
   * Verifica se elemento deve ser excluído da verificação
   */
  isExcludedElement(element) {
    if (!element) return true;
    
    const excludedTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED'];
    const excludedClasses = ['veritas-', 'ad-', 'advertisement', 'sidebar', 'navigation'];
    const excludedIds = ['header', 'footer', 'nav', 'sidebar', 'advertisement'];
    
    // Verificar tag
    if (excludedTags.includes(element.tagName)) return true;
    
    // Verificar classes
    const className = element.className || '';
    if (excludedClasses.some(cls => className.includes(cls))) return true;
    
    // Verificar ID
    const id = element.id || '';
    if (excludedIds.some(excludedId => id.includes(excludedId))) return true;
    
    // Verificar elementos de formulário
    if (element.closest('form, input, textarea, select')) return true;
    
    // Verificar elementos editáveis
    if (element.isContentEditable || element.closest('[contenteditable="true"]')) return true;
    
    return false;
  }
  
  /**
   * Analisa a seleção e extrai metadados
   */
  analyzeSelection(selection, text) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Analisar contexto
    const context = this.extractContext(range);
    
    // Detectar tipo de conteúdo
    const contentType = this.detectContentType(text, context);
    
    // Calcular posição otimizada
    const position = this.calculateOptimalPosition(rect);
    
    return {
      text: text,
      originalText: selection.toString(),
      rect: rect,
      position: position,
      context: context,
      contentType: contentType,
      timestamp: Date.now(),
      url: window.location.href,
      domain: window.location.hostname
    };
  }
  
  /**
   * Extrai contexto ao redor da seleção
   */
  extractContext(range) {
    try {
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE ? 
        container.parentElement : container;
      
      // Extrair texto do parágrafo ou elemento pai
      const contextElement = element.closest('p, div, article, section') || element;
      const fullText = contextElement.textContent || '';
      
      // Encontrar posição da seleção no contexto
      const selectedText = range.toString();
      const startIndex = fullText.indexOf(selectedText);
      
      // Extrair contexto antes e depois
      const beforeContext = startIndex > 0 ? 
        fullText.substring(Math.max(0, startIndex - 100), startIndex) : '';
      const afterContext = startIndex >= 0 ? 
        fullText.substring(startIndex + selectedText.length, 
                          Math.min(fullText.length, startIndex + selectedText.length + 100)) : '';
      
      return {
        before: beforeContext.trim(),
        after: afterContext.trim(),
        element: contextElement.tagName.toLowerCase(),
        fullText: fullText.substring(0, 500) // Limitar tamanho
      };
    } catch (error) {
      console.warn('Erro ao extrair contexto:', error);
      return { before: '', after: '', element: '', fullText: '' };
    }
  }
  
  /**
   * Detecta tipo de conteúdo
   */
  detectContentType(text, context) {
    // Detectar números e estatísticas
    if (/\d+%|\d+\.\d+|\d+,\d+/.test(text)) {
      return 'statistic';
    }
    
    // Detectar citações
    if (text.includes('"') || text.includes('"') || text.includes('"')) {
      return 'quote';
    }
    
    // Detectar afirmações científicas
    if (/estudo|pesquisa|cientista|universidade|revista|publicado/i.test(text)) {
      return 'scientific';
    }
    
    // Detectar notícias
    if (context.element === 'article' || /notícia|jornal|reportagem/i.test(context.fullText)) {
      return 'news';
    }
    
    // Detectar opiniões
    if (/acredito|penso|acho|opinião|creio/i.test(text)) {
      return 'opinion';
    }
    
    return 'general';
  }
  
  /**
   * Calcula posição otimizada para o botão
   */
  calculateOptimalPosition(rect) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    let x = rect.left + scrollX;
    let y = rect.bottom + scrollY + 5;
    
    // Ajustar se sair da viewport horizontalmente
    if (x + 120 > viewportWidth) { // 120px = largura estimada do botão
      x = viewportWidth - 120 - 10;
    }
    
    // Ajustar se sair da viewport verticalmente
    if (y + 40 > viewportHeight + scrollY) { // 40px = altura estimada do botão
      y = rect.top + scrollY - 45;
    }
    
    return { x, y };
  }
  
  /**
   * Obtém ícone baseado no tipo de conteúdo
   */
  getContentTypeIcon(contentType) {
    const icons = {
      'statistic': '📊',
      'quote': '💬',
      'scientific': '🔬',
      'news': '📰',
      'opinion': '💭',
      'general': '🛡️'
    };
    
    return icons[contentType] || icons.general;
  }
  
  /**
   * Obtém label baseado no tipo de conteúdo
   */
  getContentTypeLabel(contentType) {
    const labels = {
      'statistic': 'Verificar Dado',
      'quote': 'Verificar Citação',
      'scientific': 'Verificar Estudo',
      'news': 'Verificar Notícia',
      'opinion': 'Analisar Opinião',
      'general': 'Verificar'
    };
    
    return labels[contentType] || labels.general;
  }
  
  /**
   * Verifica se há seleção ativa
   */
  hasActiveSelection() {
    const selection = window.getSelection();
    return selection && selection.rangeCount > 0 && selection.toString().trim().length > 0;
  }
  
  /**
   * Obtém seleção atual
   */
  getCurrentSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const text = this.extractSelectedText(selection);
    if (!this.isValidSelection(text, selection)) return null;
    
    return this.analyzeSelection(selection, text);
  }
}
