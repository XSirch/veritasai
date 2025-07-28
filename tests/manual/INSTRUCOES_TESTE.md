
# 🔍 Instruções de Teste - Verificação Automática VeritasAI

## 📋 Pré-requisitos
1. Extensão VeritasAI instalada no Chrome
2. Modo desenvolvedor ativado
3. Console do DevTools aberto (F12)

## 🧪 Teste 1: Verificação Manual (Padrão)

### Passos:
1. Abrir popup da extensão
2. Ir para configurações
3. Desmarcar "Verificação automática"
4. Salvar configurações
5. Abrir uma página web qualquer
6. Selecionar texto com mais de 10 caracteres

### Resultado Esperado:
- Aparece botão "Verificar" próximo ao texto selecionado
- Console mostra: "👆 Mostrando botão de verificação manual..."
- Clicar no botão inicia a verificação

## 🧪 Teste 2: Verificação Automática

### Passos:
1. Abrir popup da extensão
2. Ir para configurações
3. Marcar "Verificação automática"
4. Salvar configurações
5. Abrir uma página web qualquer
6. Selecionar texto com mais de 10 caracteres

### Resultado Esperado:
- Verificação inicia automaticamente (sem botão)
- Console mostra: "⚡ Executando verificação automática..."
- Tooltip com resultado aparece automaticamente

## 🧪 Teste 3: Textos de Exemplo

### Textos para Testar:
1. **Científico**: "A Terra é plana e isso é comprovado pela ciência"
2. **Estatística**: "99% dos médicos recomendam fumar cigarros"
3. **Citação**: "Segundo a NASA, nunca fomos à Lua"
4. **Normal**: "O céu é azul durante o dia"
5. **Muito curto**: "Oi" (deve ser ignorado)

## 🔍 Verificação de Logs

### Console do Content Script:
```javascript
// Configuração carregada
"⚙️ Configurações aplicadas: { autoVerify: true/false }"

// Seleção detectada
"🔍 Texto selecionado: { autoVerify: true/false }"

// Verificação automática
"⚡ Executando verificação automática..."

// Verificação manual
"👆 Mostrando botão de verificação manual..."
```

### Console do Background Script:
```javascript
// Configuração salva
"💾 Salvando configuração..."
"🔄 Configuração atualizada: { autoVerify: true }"

// Configuração carregada
"📋 Obtendo configuração..."
```

## 🐛 Troubleshooting

### Problema: Configuração não salva
```javascript
// No console da página de configurações:
chrome.storage.sync.get(['veritasConfig']).then(console.log);
```

### Problema: Seleção não detectada
```javascript
// No console da página web:
window.getSelection().toString();
```

### Problema: Extensão não carrega
1. Verificar erros no console da extensão
2. Recarregar extensão em chrome://extensions/
3. Verificar permissões

## ✅ Critérios de Sucesso

- [ ] Configuração "Verificação automática" funciona
- [ ] Modo manual mostra botão corretamente
- [ ] Modo automático executa verificação imediatamente
- [ ] Logs aparecem no console conforme esperado
- [ ] Textos curtos são ignorados
- [ ] Interface responde às mudanças de configuração

## 📊 Relatório de Teste

### Ambiente:
- Chrome versão: ___________
- Extensão versão: 1.0.21+
- Data do teste: ___________

### Resultados:
- Teste 1 (Manual): [ ] ✅ [ ] ❌
- Teste 2 (Automático): [ ] ✅ [ ] ❌
- Teste 3 (Textos): [ ] ✅ [ ] ❌

### Observações:
_________________________________
_________________________________
_________________________________

