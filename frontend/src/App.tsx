import { useState, useCallback } from 'react';
import type { Language, Strength, LLMProvider, TransformResponse } from './types';
import { fetchModels, postTransform } from './api';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';

type ModelsStatus = 'idle' | 'loading' | 'ok' | 'error';

const HEADER_CSS: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '12px 22px', borderBottom: '1px solid var(--border)',
  background: 'var(--surface)', flexShrink: 0,
};
const TAG_CSS: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 7px',
  borderRadius: 3, background: '#1a1d2e', border: '1px solid var(--border)',
  color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.8px',
};
const MAIN_CSS: React.CSSProperties = {
  display: 'flex', flex: 1, overflow: 'hidden',
};

export default function App() {
  // Form state
  const [text, setText]               = useState('');
  const [lang, setLang]               = useState<Language>('de');
  const [strength, setStrength]       = useState<Strength>(1);
  const [llmEnabled, setLlmEnabled]   = useState(false);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('ollama');
  const [ollamaModel, setOllamaModel] = useState('');
  const [ollamaEmbed, setOllamaEmbed] = useState('');
  const [oaiBaseUrl, setOaiBaseUrl]   = useState('http://localhost:1234');
  const [oaiApiKey, setOaiApiKey]     = useState('');
  const [oaiModel, setOaiModel]       = useState('');
  const [oaiEmbed, setOaiEmbed]       = useState('');

  // Model discovery
  const [models, setModels]               = useState<string[]>([]);
  const [modelsStatus, setModelsStatus]   = useState<ModelsStatus>('idle');
  const [modelsLoaded, setModelsLoaded]   = useState(false);

  // Results
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<TransformResponse | null>(null);
  const [usedModel, setUsedModel]   = useState<string>('');
  const [error, setError]           = useState<string | null>(null);

  const handleLoadModels = useCallback(async () => {
    if (modelsLoaded) return;
    setModelsStatus('loading');
    try {
      const list = await fetchModels();
      setModels(list);
      if (list.length > 0) {
        setModelsStatus('ok');
        setModelsLoaded(true);
        const preferred = list.find(m => m.startsWith('llama3'));
        if (preferred) setOllamaModel(preferred);
      } else {
        setModelsStatus('error');
      }
    } catch {
      setModelsStatus('error');
    }
  }, [modelsLoaded]);

  const handleOaiChange = useCallback((field: 'baseUrl' | 'apiKey' | 'model' | 'embedModel', v: string) => {
    if (field === 'baseUrl')    setOaiBaseUrl(v);
    if (field === 'apiKey')     setOaiApiKey(v);
    if (field === 'model')      setOaiModel(v);
    if (field === 'embedModel') setOaiEmbed(v);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);

    const llmModel = llmProvider === 'openai_compatible' ? oaiModel : ollamaModel;
    const embedModel = llmProvider === 'openai_compatible' ? oaiEmbed : ollamaEmbed;

    try {
      const res = await postTransform({
        text: text.trim(),
        language: lang,
        profile: 'neutralize_v1',
        strength,
        llm: {
          enabled: llmEnabled,
          ...(llmProvider !== 'ollama'             ? { provider: llmProvider }        : {}),
          ...(llmEnabled && llmProvider === 'openai_compatible' && oaiBaseUrl ? { baseUrl: oaiBaseUrl } : {}),
          ...(llmEnabled && oaiApiKey              ? { apiKey: oaiApiKey }             : {}),
          ...(llmEnabled && llmModel               ? { model: llmModel }               : {}),
          ...(llmEnabled && embedModel             ? { embeddingModel: embedModel }    : {}),
        },
      });
      setResult(res);
      setUsedModel(llmModel);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }, [text, lang, strength, llmEnabled, llmProvider, ollamaModel, ollamaEmbed, oaiBaseUrl, oaiApiKey, oaiModel, oaiEmbed]);

  return (
    <>
      <header style={HEADER_CSS}>
        <h1 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.3px' }}>ContextBlur</h1>
        <span style={TAG_CSS}>v0.1.0</span>
      </header>
      <main style={MAIN_CSS}>
        <InputPanel
          text={text}
          lang={lang}
          strength={strength}
          llmEnabled={llmEnabled}
          llmProvider={llmProvider}
          ollamaModel={ollamaModel}
          ollamaEmbedModel={ollamaEmbed}
          oaiBaseUrl={oaiBaseUrl}
          oaiApiKey={oaiApiKey}
          oaiModel={oaiModel}
          oaiEmbedModel={oaiEmbed}
          models={models}
          modelsStatus={modelsStatus}
          submitting={submitting}
          onTextChange={setText}
          onLangChange={setLang}
          onStrengthChange={setStrength}
          onLLMEnabledChange={setLlmEnabled}
          onLLMProviderChange={setLlmProvider}
          onOllamaModelChange={setOllamaModel}
          onOllamaEmbedChange={setOllamaEmbed}
          onOaiChange={handleOaiChange}
          onLoadModels={handleLoadModels}
          onSubmit={handleSubmit}
        />
        <ResultsPanel result={result} error={error} strength={strength} llmModel={usedModel} />
      </main>
    </>
  );
}
