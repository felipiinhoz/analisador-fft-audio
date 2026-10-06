import React, { useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import FFT from "fft.js";
import {
  AreaChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  BarChart3,
  Calculator,
  Gauge,
  RefreshCw,
  Settings2,
  Waves,
  Upload,
  Music
} from "lucide-react";
import "./styles.css";

const DEFAULTS = { A: 1, ff: 2, fa: 10, T: 1 };

function App() {
  const [mode, setMode] = useState("synthetic"); // 'synthetic' ou 'audio'
  const [params, setParams] = useState(DEFAULTS);
  const [applied, setApplied] = useState(DEFAULTS);
  const [audioResult, setAudioResult] = useState(null);
  const fileInputRef = useRef(null);

  // Função para processar Áudio (Equivalente ao audioread)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Pegamos apenas o primeiro canal (Mono)
    const x = audioBuffer.getChannelData(0);
    const fa = audioBuffer.sampleRate;
    const NP = x.length;
    const T = NP / fa;

    const result = analyzeSignal(x, fa, NP, T);
    setAudioResult(result);
    setMode("audio");
  };

  // Lógica de cálculo (Compatível com MATLAB)
  const analyzeSignal = (x, fa, NP, T) => {
    const dt = 1 / fa;
    
    // FFT.js exige potência de 2
    const fftSize = 2 ** Math.ceil(Math.log2(Math.max(2, NP)));
    const fft = new FFT(fftSize);
    const input = new Float64Array(fftSize).fill(0);
    for (let i = 0; i < NP; i++) input[i] = x[i];

    const out = fft.createComplexArray();
    fft.realTransform(out, input);
    fft.completeSpectrum(out);

    const half = Math.floor(fftSize / 2);
    const spectrum = [];
    for (let k = 0; k <= half; k++) {
      const re = out[2 * k];
      const im = out[2 * k + 1];
      // P = abs(X)/NP (Igual ao MATLAB fornecido)
      let amplitude = Math.hypot(re, im) / NP;
      // Para espectro unilateral, dobramos a amplitude (exceto DC e Nyquist)
      if (k > 0 && k < half) amplitude *= 2;
      
      spectrum.push({
        frequency: k * (fa / fftSize),
        amplitude,
      });
    }

    // Downsampling para o gráfico não travar (máx 2000 pontos)
    const step = Math.max(1, Math.floor(NP / 2000));
    const timeData = [];
    for (let i = 0; i < NP; i += step) {
      timeData.push({ time: i / fa, amplitude: x[i] });
    }

    return { NP, dt, df: fa / NP, fa, timeData, spectrum, rawX: x };
  };

  // Sinal Sintético
  const syntheticData = useMemo(() => {
    const { A, ff, fa, T } = applied;
    const NP = Math.max(1, Math.floor(fa * T));
    const x = Array.from({ length: NP }, (_, i) => A * Math.sin(2 * Math.PI * ff * (i / fa)));
    return analyzeSignal(x, fa, NP, T);
  }, [applied]);

  const data = mode === "synthetic" ? syntheticData : audioResult;

  const peak = data?.spectrum.reduce((prev, curr) => 
    curr.amplitude > prev.amplitude ? curr : prev, data.spectrum[0]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Waves size={22} /></div>
          <div>
            <h1>Analisador de Sinais</h1>
            <p>{mode === 'synthetic' ? 'Senoide Gerada' : 'Áudio Carregado'}</p>
          </div>
        </div>
        <div className="actions" style={{marginTop: 0}}>
           <button 
            className={mode === 'synthetic' ? "primary-btn" : "secondary-btn"}
            onClick={() => setMode("synthetic")}
          >
            Senoide
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="audio/*" 
            style={{display: 'none'}} 
          />
          <button 
            className={mode === 'audio' ? "primary-btn" : "secondary-btn"}
            onClick={() => fileInputRef.current.click()}
          >
            <Upload size={16} /> Upload Áudio
          </button>
        </div>
      </header>

      <main className="content">
        {mode === "synthetic" && (
          <section className="control-card" style={{marginBottom: '20px'}}>
            <div className="controls-grid">
              <Parameter label="Amplitude (A)" value={params.A} onChange={v => setParams(p => ({...p, A: v}))} />
              <Parameter label="Freq. Sinal (Hz)" value={params.ff} onChange={v => setParams(p => ({...p, ff: v}))} />
              <Parameter label="Amostragem (fa)" value={params.fa} onChange={v => setParams(p => ({...p, fa: v}))} />
              <Parameter label="Tempo (T)" value={params.T} onChange={v => setParams(p => ({...p, T: v}))} />
            </div>
            <button className="primary-btn" style={{marginTop: '15px'}} onClick={() => setApplied(params)}>
              <RefreshCw size={16} /> Aplicar
            </button>
          </section>
        )}

        <section className="stats-grid">
          <Stat icon={<Calculator />} label="Amostras (NP)" value={data.NP} />
          <Stat icon={<Gauge />} label="Taxa (fa)" value={`${data.fa} Hz`} />
          <Stat icon={<BarChart3 />} label="Resolução (df)" value={`${data.df.toFixed(4)} Hz`} />
          <Stat icon={<Activity />} label="Pico Freq." value={`${peak?.frequency.toFixed(2)} Hz`} />
        </section>

        <div className="charts-grid">
          <ChartCard icon={<Waves size={19} />} title="Domínio do Tempo" subtitle="Amplitude x Tempo">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="time" tickFormatter={v => `${v.toFixed(2)}s`} tick={{fontSize: 10}} />
                <YAxis tick={{fontSize: 10}} />
                <Tooltip labelFormatter={v => `t: ${v.toFixed(4)}s`} />
                <Line type="monotone" dataKey="amplitude" stroke="#4f8cff" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={<BarChart3 size={19} />} title="Espectro de Amplitude" subtitle="FFT Unilateral">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.spectrum}>
                <XAxis dataKey="frequency" tickFormatter={v => `${v.toFixed(0)}Hz`} tick={{fontSize: 10}} />
                <YAxis tick={{fontSize: 10}} />
                <Tooltip labelFormatter={v => `${v.toFixed(2)} Hz`} />
                <Area type="monotone" dataKey="amplitude" stroke="#8b72ff" fill="#8b72ff33" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </main>
    </div>
  );
}

function Parameter({ label, value, onChange }) {
  return (
    <label className="parameter">
      <span>{label}</span>
      <div className="input-wrap">
        <input type="number" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </label>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function ChartCard({ icon, title, subtitle, children }) {
  return (
    <article className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <div className="chart-icon">{icon}</div>
          <div><h3>{title}</h3><p>{subtitle}</p></div>
        </div>
      </div>
      <div className="chart-area">{children}</div>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);