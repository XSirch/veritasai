# 🐛 Debug: Seleção de Texto Não Funciona

## 📊 Status Atual
- ✅ Content script carregando: `🚀 VeritasAI Content Script iniciando...`
- ✅ Window.VeritasAI definido: `✅ window.VeritasAI definido`
- ✅ Script carregado: `🎉 Content script carregado com sucesso!`
- ❌ **Problema**: Seleção de texto não dispara verificação

## 🔍 Debug Passo a Passo

### Passo 1: Verificar se a extensão está completamente inicializada
```javascript
// Cole no console da página (F12):
console.log('=== DEBUG VERITASAI ===');
console.log('1. VeritasAI existe:', !!window.VeritasAI);
console.log('2. Content script:', !!window.VeritasContentScript);
console.log('3. Configuração:', window.VeritasAI?.VERITAS_CONFIG);
console.log('4. Estado:', window.VeritasAI?.extensionState);
```

### Passo 2: Verificar event listeners
```javascript
// Cole no console da página:
console.log('=== VERIFICAR LISTENERS ===');
const events = ['mouseup', 'keyup', 'selectionchange'];
events.forEach(event => {
  const listeners = getEventListeners(document);
  console.log(`${event} listeners:`, listeners[event]?.length || 0);
});
```

### Passo 3: Testar seleção manualmente
```javascript
// Cole no console da página:
console.log('=== TESTE MANUAL DE SELEÇÃO ===');

// Criar texto de teste
const testDiv = document.createElement('div');
testDiv.id = 'veritas-test-text';
testDiv.innerHTML = 'Este é um texto de teste para verificação automática do VeritasAI';
testDiv.style.cssText = 'padding: 20px; background: yellow; margin: 20px; font-size: 16px;';
document.body.appendChild(testDiv);

// Selecionar o texto
const range = document.createRange();
range.selectNodeContents(testDiv);
const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(range);

console.log('Texto selecionado:', selection.toString());
console.log('Range count:', selection.rangeCount);

// Disparar eventos manualmente
document.dispatchEvent(new Event('selectionchange'));
document.dispatchEvent(new MouseEvent('mouseup'));
```

### Passo 4: Verificar se content-main.js está carregado
```javascript
// Cole no console da página:
console.log('=== VERIFICAR MÓDULOS ===');
console.log('Content script global:', window.VeritasContentScript);

// Tentar acessar a instância
if (window.VeritasContentScript) {
  console.log('Instância encontrada:', window.VeritasContentScript);
  console.log('Métodos disponíveis:', Object.getOwnPropertyNames(window.VeritasContentScript));
} else {
  console.error('❌ VeritasContentScript não encontrado!');
}
```

### Passo 5: Verificar configurações da extensão
```javascript
// Cole no console da página:
console.log('=== VERIFICAR CONFIGURAÇÕES ===');

// Verificar storage
chrome.runtime.sendMessage({action: 'getSettings'}, response => {
  console.log('Configurações do background:', response);
});

// Verificar configuração local
if (window.VeritasAI?.VERITAS_CONFIG) {
  console.log('Configuração local:', window.VeritasAI.VERITAS_CONFIG);
} else {
  console.error('❌ Configuração local não encontrada!');
}
```

### Passo 6: Forçar inicialização se necessário
```javascript
// Cole no console da página:
console.log('=== FORÇAR INICIALIZAÇÃO ===');

// Se VeritasContentScript não existe, tentar recriar
if (!window.VeritasContentScript) {
  console.log('Tentando recriar content script...');
  
  // Simular carregamento do script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/content.js');
  document.head.appendChild(script);
  
  setTimeout(() => {
    console.log('Após reload - VeritasContentScript:', !!window.VeritasContentScript);
  }, 2000);
}
```

## 🔧 Soluções Possíveis

### Solução 1: Recarregar extensão
1. Ir para `chrome://extensions/`
2. Encontrar "VeritasAI"
3. Clicar no botão "Recarregar" (ícone de refresh)
4. Recarregar a página web
5. Testar seleção novamente

### Solução 2: Verificar permissões
```javascript
// Verificar se extensão tem permissões necessárias
chrome.permissions.getAll(permissions => {
  console.log('Permissões:', permissions);
});
```

### Solução 3: Verificar manifest.json
- Verificar se `content_scripts` está configurado corretamente
- Verificar se `matches` inclui a URL atual
- Verificar se `run_at` está como "document_end"

### Solução 4: Debug do content script
```javascript
// Verificar se há erros no content script
console.log('=== VERIFICAR ERROS ===');

// Verificar se há elementos da extensão na página
const veritasElements = document.querySelectorAll('[id^="veritas"]');
console.log('Elementos VeritasAI na página:', veritasElements.length);

// Verificar se CSS foi injetado
const veritasStyles = Array.from(document.styleSheets).find(sheet => 
  sheet.href && sheet.href.includes('veritas')
);
console.log('Estilos VeritasAI carregados:', !!veritasStyles);
```

## 📋 Checklist de Debug

Execute cada item e marque o resultado:

- [ ] **Passo 1**: VeritasAI existe no window
- [ ] **Passo 2**: Event listeners estão configurados
- [ ] **Passo 3**: Seleção manual funciona
- [ ] **Passo 4**: Content-main.js está carregado
- [ ] **Passo 5**: Configurações estão corretas
- [ ] **Passo 6**: Inicialização forçada funciona

## 🚨 Problemas Comuns

### Problema: Content script não carrega
**Causa**: Manifest.json incorreto ou extensão não recarregada
**Solução**: Recarregar extensão e verificar manifest

### Problema: Event listeners não funcionam
**Causa**: Script carrega mas não inicializa completamente
**Solução**: Verificar erros no console e forçar inicialização

### Problema: Configuração não carrega
**Causa**: Background script não responde
**Solução**: Verificar background script e storage

### Problema: Seleção detectada mas nada acontece
**Causa**: Lógica de verificação com erro
**Solução**: Debug do método handleTextSelection

## 📞 Próximos Passos

1. **Execute o debug passo a passo**
2. **Anote os resultados de cada passo**
3. **Identifique onde o fluxo para**
4. **Aplique a solução correspondente**
5. **Teste novamente**

Se o problema persistir, execute todos os passos e compartilhe os resultados para análise mais detalhada.
