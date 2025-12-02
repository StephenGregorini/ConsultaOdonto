import React, { useState, useRef, useMemo } from "react";
import HistoricoModal from "./HistoricoModal";
import PageLayout from "./components/ui/PageLayout";
import { API_BASE_URL } from "./apiConfig";

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLogIndex, setShowLogIndex] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef(null);

  const handleFiles = (e) => setFiles(Array.from(e.target.files));
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) setFiles(dropped);
  };

  const upload = async () => {
    if (files.length === 0 || loading) return;

    setLoading(true);
    setResults([]);
    setShowLogIndex(null);

    const newResults = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        newResults.push({ file: file.name, data: json, error: !res.ok });

      } catch (err) {
        newResults.push({
          file: file.name,
          data: {
            error: "Erro ao se comunicar com o servidor.",
            details: String(err),
          },
          error: true,
        });
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  const humanFileInfo = useMemo(() => {
    if (!files.length) return "Nenhum selecionado";

    if (files.length === 1) {
      const f = files[0];
      const kb = f.size / 1024;
      const size =
        kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`;
      return `${f.name} • ${size}`;
    }

    return `${files.length} arquivos selecionados`;
  }, [files]);

  return (
    <>
      <PageLayout>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
              Central de <span className="text-sky-400">Upload</span>
            </h1>
            <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-2xl">
              Envie um ou vários arquivos para processamento, validação e ingestão automática.
            </p>
          </div>

          <button
            onClick={() => setShowHistory(true)}
            className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-sky-500/50 hover:text-sky-200 text-slate-300 text-sm transition"
          >
            Ver Histórico
          </button>
        </div>

        {/* GRID */}
        <div className="grid lg:grid-cols-2 gap-8">

          {/* =============== COLUNA ESQUERDA (ALINHAMENTO FIXO) =============== */}
          <div className="flex flex-col h-full">

            {/* CARD SUPERIOR */}
            <div className="
              rounded-3xl bg-slate-900/70 border border-slate-800 p-7 
              backdrop-blur shadow-lg shadow-sky-900/30 
              flex flex-col flex-grow justify-center
            ">
              <h2 className="text-lg font-semibold text-slate-100 mb-8 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Como funciona o processamento
              </h2>

              <div className="space-y-7">

                <div className="flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300 flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">
                      Upload de múltiplos arquivos
                    </p>
                    <p className="text-slate-400 text-sm">
                      Agora você pode enviar vários arquivos ao mesmo tempo.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300 flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">
                      Validação e consistência
                    </p>
                    <p className="text-slate-400 text-sm">
                      O backend checa estrutura, colunas e integridade dos dados.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300 flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">
                      Resumo por arquivo
                    </p>
                    <p className="text-slate-400 text-sm">
                      Cada arquivo retorna um relatório individual.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* MINI CARDS (AGORA ALINHAM PERFEITO COM A DIREITA) */}
            <div className="mt-8 grid sm:grid-cols-3 gap-3 text-xs sm:text-sm">

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Selecionados</p>
                <p className="font-semibold text-sky-300 truncate">{humanFileInfo}</p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Status</p>
                <p className="font-semibold">
                  {loading ? "Processando..." : results.length > 0 ? "Concluído" : "Aguardando"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Próximo passo</p>
                <p className="font-semibold text-emerald-300">
                  {results.length > 0 ? "Revisar retorno" : "Enviar arquivos"}
                </p>
              </div>

            </div>
          </div>

          {/* =============== COLUNA DIREITA (ALINHAMENTO FIXO) =============== */}
          <div className="flex flex-col h-full space-y-6">

            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-sky-900/40 p-7 backdrop-blur flex-grow flex flex-col">
              <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-sm">
                  ↑
                </span>
                Enviar arquivos
              </h2>

              {/* DROPZONE */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-2xl px-4 cursor-pointer transition flex flex-col justify-center flex-grow
                  ${dragging
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-slate-700 bg-slate-900/60 hover:border-sky-500/80 hover:bg-slate-900/70"}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xls,.xlsx,.csv,.txt"
                  className="hidden"
                  onChange={handleFiles}
                />

                <div className="flex flex-col items-center text-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-sky-500/15 flex items-center justify-center text-sky-300">
                    <svg
                      className="w-7 h-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                      <polyline points="9 10 12 7 15 10" />
                      <line x1="12" y1="7" x2="12" y2="16" />
                    </svg>
                  </div>

                  <div>
                    <p className="font-medium text-slate-50">
                      {files.length > 0
                        ? `${files.length} arquivo(s) selecionado(s)`
                        : "Arraste ou clique para selecionar"}
                    </p>

                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Formatos aceitos:{" "}
                      <span className="text-sky-300 font-semibold">
                        .xlsx, .csv, .txt
                      </span>
                    </p>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-3 inline-flex flex-col items-center gap-1 bg-slate-900/90 border border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-200 max-h-28 overflow-auto">
                      {files.map((f) => (
                        <span key={f.name} className="truncate max-w-[240px]">{f.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BOTÃO */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={upload}
                  disabled={files.length === 0 || loading}
                  className={`
                    inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition
                    w-full sm:w-auto
                    ${
                      files.length === 0 || loading
                        ? "bg-sky-500/40 text-slate-200 cursor-not-allowed"
                        : "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-900/40"
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-slate-950/20 border-t-slate-950 animate-spin" />
                      Processando...
                    </>
                  ) : "Enviar para processamento"}
                </button>

                <p className="text-[11px] sm:text-xs text-slate-400">
                  Cada arquivo será enviado individualmente.
                </p>
              </div>

              {loading && (
                <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-500 animate-[pulse_1.4s_ease-in-out_infinite]" />
                </div>
              )}
            </div>

            {/* RESULTADOS */}
            {results.length > 0 && (
              <div className="space-y-6">
                {results.map((res, index) => (
                  <div key={index} className="rounded-3xl bg-slate-950/80 border border-slate-800 shadow-lg p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-100">
                        Resultado — {res.file}
                      </h3>
                      <span
                        className={`
                          text-[11px] px-2 py-1 rounded-full
                          ${
                            res.error
                              ? "bg-rose-800/40 text-rose-300"
                              : "bg-slate-800 text-slate-300"
                          }
                        `}
                      >
                        {res.error ? "Erro" : "OK"}
                      </span>
                    </div>

                    <button
                      onClick={() => setShowLogIndex(showLogIndex === index ? null : index)}
                      className="text-sky-300 text-xs font-medium hover:underline"
                    >
                      {showLogIndex === index ? "Ocultar log ▲" : "Ver log detalhado ▼"}
                    </button>

                    {showLogIndex === index && (
                      <div className="mt-4 rounded-2xl bg-slate-950 border border-slate-800 max-h-64 overflow-auto text-[11px] sm:text-xs">
                        <pre className="p-3 text-slate-200 whitespace-pre-wrap">
                          {JSON.stringify(res.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </PageLayout>

      <style>
        {`
        @keyframes pulse {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        `}
      </style>

      <HistoricoModal open={showHistory} onClose={() => setShowHistory(false)} />
    </>
  );
}
