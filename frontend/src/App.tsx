import { useState, useCallback } from 'react';
import type {
  Language, Strength, LLMProvider, TransformResponse, CurvePoint,
} from './types';
import { postTransform } from './api';
import { InputPanel } from './components/InputPanel';
import { CenterPanel } from './components/CenterPanel';
import { FeatureDeltaPanel } from './components/FeatureDeltaPanel';
import { ThreatModelDropdown } from './components/ThreatModelDropdown';
import styles from './App.module.css';

export default function App() {
  // ── Input state ───────────────────────────────────────────────────────────
  const [text, setText]         = useState('');
  const [lang, setLang]         = useState<Language>('de');
  const [strength, setStrength] = useState<Strength>(2);

  // ── LLM config ────────────────────────────────────────────────────────────
  const [llmEnabled, setLlmEnabled]     = useState(false);
  const [llmProvider, setLlmProvider]   = useState<LLMProvider>('ollama');
  const [ollamaModel, setOllamaModel]   = useState('');
  const [ollamaEmbed, setOllamaEmbed]   = useState('');
  const [oaiBaseUrl, setOaiBaseUrl]     = useState('http://localhost:1234');
  const [oaiApiKey, setOaiApiKey]       = useState('');
  const [oaiModel, setOaiModel]         = useState('');
  const [oaiEmbed, setOaiEmbed]         = useState('');
  const [models, setModels]             = useState<string[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // ── View state ────────────────────────────────────────────────────────────
  const [heatmapMode, setHeatmapMode] = useState<'delta' | 'risk'>('delta');

  // ── Results ───────────────────────────────────────────────────────────────
  const [result, setResult]   = useState<TransformResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Tradeoff curve ────────────────────────────────────────────────────────
  const [curveData, setCurveData]           = useState<CurvePoint[] | null>(null);
  const [computingCurve, setComputingCurve] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLoadModels = useCallback(async () => {
    if (modelsLoaded) return;
    try {
      const res = await fetch('/models');
      if (!res.ok) return;
      const data = (await res.json()) as { models: string[] };
      const list = data.models ?? [];
      setModels(list);
      setModelsLoaded(true);
      const preferred = list.find((m) => m.startsWith('llama3'));
      if (preferred) setOllamaModel(preferred);
    } catch { /* ollama unavailable */ }
  }, [modelsLoaded]);

  const handleOaiChange = useCallback(
    (field: 'baseUrl' | 'apiKey' | 'model' | 'embedModel', v: string) => {
      if (field === 'baseUrl')    setOaiBaseUrl(v);
      if (field === 'apiKey')     setOaiApiKey(v);
      if (field === 'model')      setOaiModel(v);
      if (field === 'embedModel') setOaiEmbed(v);
    },
    [],
  );

  const buildLLMConfig = useCallback(() => {
    const llmModel   = llmProvider === 'openai_compatible' ? oaiModel   : ollamaModel;
    const embedModel = llmProvider === 'openai_compatible' ? oaiEmbed   : ollamaEmbed;
    return {
      enabled: llmEnabled,
      ...(llmProvider !== 'ollama' ? { provider: llmProvider } : {}),
      ...(llmEnabled && llmProvider === 'openai_compatible' && oaiBaseUrl ? { baseUrl: oaiBaseUrl } : {}),
      ...(llmEnabled && oaiApiKey  ? { apiKey: oaiApiKey }    : {}),
      ...(llmEnabled && llmModel   ? { model: llmModel }      : {}),
      ...(llmEnabled && embedModel ? { embeddingModel: embedModel } : {}),
    };
  }, [llmEnabled, llmProvider, ollamaModel, ollamaEmbed, oaiBaseUrl, oaiApiKey, oaiModel, oaiEmbed]);

  const handleRun = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await postTransform({
        text: text.trim(),
        language: lang,
        profile: 'neutralize_v1',
        strength,
        llm: buildLLMConfig(),
      });
      setResult(r);
      setCurveData(null); // invalidate curve on new result
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [text, lang, strength, buildLLMConfig]);

  const handleComputeCurve = useCallback(async () => {
    if (!text.trim()) return;
    setComputingCurve(true);
    try {
      const results = await Promise.all(
        ([0, 1, 2, 3] as Strength[]).map((s) =>
          postTransform({
            text: text.trim(),
            language: lang,
            profile: 'neutralize_v1',
            strength: s,
            llm: { enabled: false },
          }),
        ),
      );
      setCurveData(
        results.map((r, i) => ({
          strength: i as Strength,
          sui: r.sui,
          ssi: r.ssi,
          delta: r.delta,
        })),
      );
    } catch { /* leave curve null */ }
    finally { setComputingCurve(false); }
  }, [text, lang]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Controlled Signal Degradation Lab</h1>
          <p className={styles.subtitle}>
            Experimental environment for stylometric and semantic signal manipulation.
            Transformations are statistical proxies — not anonymity guarantees.
          </p>
        </div>
        <ThreatModelDropdown />
      </header>

      <div className={styles.workspace}>
        <InputPanel
          text={text}
          lang={lang}
          result={result}
          onTextChange={setText}
          onLangChange={setLang}
        />

        <CenterPanel
          text={text}
          strength={strength}
          heatmapMode={heatmapMode}
          result={result}
          loading={loading}
          error={error}
          llmEnabled={llmEnabled}
          llmProvider={llmProvider}
          models={models}
          ollamaModel={ollamaModel}
          ollamaEmbedModel={ollamaEmbed}
          oaiBaseUrl={oaiBaseUrl}
          oaiApiKey={oaiApiKey}
          oaiModel={oaiModel}
          oaiEmbedModel={oaiEmbed}
          onStrengthChange={setStrength}
          onHeatmapModeChange={setHeatmapMode}
          onLLMEnabledChange={setLlmEnabled}
          onLLMProviderChange={setLlmProvider}
          onOllamaModelChange={setOllamaModel}
          onOllamaEmbedChange={setOllamaEmbed}
          onOaiChange={handleOaiChange}
          onLoadModels={handleLoadModels}
          onRun={handleRun}
        />

        <FeatureDeltaPanel
          result={result}
          curveData={curveData}
          computingCurve={computingCurve}
          currentStrength={strength}
          onComputeCurve={handleComputeCurve}
          onStrengthSelect={setStrength}
        />
      </div>
    </div>
  );
}
