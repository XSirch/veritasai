# 🔧 Como Instalar a Extensão VeritasAI no Chrome

## Passo a Passo

### 1. Abrir Página de Extensões
- Abra o Chrome
- Digite na barra de endereços: `chrome://extensions/`
- Ou vá em Menu (⋮) → Mais ferramentas → Extensões

### 2. Ativar Modo Desenvolvedor
- No canto superior direito, ative o toggle **"Modo do desenvolvedor"**
- Isso vai mostrar botões adicionais

### 3. Carregar a Extensão
- Clique no botão **"Carregar sem compactação"**
- Navegue até a pasta do projeto: `C:\projetos\veritasai\dist`
- Selecione a pasta `dist` e clique em "Selecionar pasta"

### 4. Verificar Instalação
A extensão deve aparecer na lista com:
- **Nome**: VeritasAI - Verificador de Informações
- **Versão**: 1.0.21
- **Status**: Ativada (toggle azul)

## ✅ Como Testar se Funcionou

### 1. Verificar na Lista
- A extensão deve estar visível em `chrome://extensions/`
- Deve estar **ativada** (toggle azul)
- Não deve ter erros vermelhos

### 2. Testar Content Script
- Vá para qualquer site (ex: `https://example.com`)
- Abra DevTools (F12)
- Na aba Console, procure por logs:
  - `🚀 VeritasAI Content Script iniciando...`
  - `✅ window.VeritasAI definido`
  - `🎯 Elemento de debug adicionado`

### 3. Verificar Elemento Visual
- Deve aparecer um **elemento verde** no canto superior direito
- Com o texto "VeritasAI Loaded"
- Ele desaparece após 3 segundos

### 4. Verificar Popup
- Clique no ícone da extensão na barra de ferramentas
- Deve abrir um popup com a interface do VeritasAI

## 🚨 Problemas Comuns

### Extensão não aparece na lista
- Verifique se selecionou a pasta `dist` correta
- Certifique-se de que o arquivo `manifest.json` está na pasta

### Erros na extensão
- Verifique se há erros vermelhos na página de extensões
- Clique em "Detalhes" → "Inspecionar visualizações" para debug

### Content script não executa
- Recarregue a página do site de teste
- Verifique se a extensão está ativada
- Veja se há erros no console

## 📁 Estrutura Esperada da Pasta dist/

```
dist/
├── manifest.json          ← Arquivo principal
├── background/
│   └── background.js      ← Service worker
├── content/
│   └── content.js         ← Content script
├── popup/
│   ├── popup.html
│   └── popup.js
├── options/
│   ├── options.html
│   └── options.js
└── assets/
    ├── icons/
    └── styles/
```

## 🔄 Recarregar Extensão

Se fizer alterações no código:
1. Execute `npm run build`
2. Vá para `chrome://extensions/`
3. Clique no ícone de **recarregar** (🔄) na extensão VeritasAI

---

**Próximo passo**: Após instalar, teste em uma página web e verifique se o elemento verde aparece!
