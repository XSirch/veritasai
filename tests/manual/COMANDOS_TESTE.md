
# 🛠️ Comandos de Teste para Desenvolvedores

## Verificar Storage da Extensão
```javascript
// No console de qualquer página:
chrome.storage.sync.get(['veritasConfig']).then(result => {
  console.log('Configuração atual:', result.veritasConfig);
});
```

## Forçar Configuração de Teste
```javascript
// Habilitar verificação automática:
chrome.storage.sync.set({
  veritasConfig: {
    autoVerify: true,
    enabled: true,
    language: 'pt-BR'
  }
}).then(() => console.log('Configuração salva'));

// Desabilitar verificação automática:
chrome.storage.sync.set({
  veritasConfig: {
    autoVerify: false,
    enabled: true,
    language: 'pt-BR'
  }
}).then(() => console.log('Configuração salva'));
```

## Testar Comunicação com Background
```javascript
// No console de qualquer página:
chrome.runtime.sendMessage({
  action: 'getSettings'
}, response => {
  console.log('Resposta do background:', response);
});
```

## Simular Seleção de Texto
```javascript
// No console da página web:
const range = document.createRange();
const textNode = document.createTextNode('Texto de teste para verificação automática');
document.body.appendChild(textNode);
range.selectNode(textNode);
const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(range);

// Disparar evento de seleção
document.dispatchEvent(new Event('selectionchange'));
```

## Verificar Estado da Extensão
```javascript
// No console da página web:
console.log('VeritasAI carregado:', !!window.VeritasAI);
console.log('Configuração:', window.VeritasAI?.VERITAS_CONFIG);
console.log('Estado:', window.VeritasAI?.extensionState);
```

