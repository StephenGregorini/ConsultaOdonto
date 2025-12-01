import React, { useState, useRef, useMemo } from "react";
import HistoricoModal from "./HistoricoModal";
import { API_BASE_URL } from "./apiConfig";

export default function Upload() {
  const [files, setFiles] = useState([]); // AGORA É UM ARRAY
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState([]); // RESULTADO DE MULTIPLOS UPLOADS
  const [loading, setLoading] = useState(false);
  const [showLogIndex, setShowLogIndex] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef(null);

  // -------------------------------
  // MULTI-UPLOAD
  // -------------------------------
  const handleFiles = (event) => {
    const selected = Array.from(event.target.files);
    setFiles(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      setFiles(dropped);
    }
  };

  // Upload múltiplo
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
//...

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

  // -------------------------------
  // Info para o card
  // -------------------------------
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

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho da página */}
        <div className="mb-10">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
              Central de Upload para <span className="text-sky-400">Score de Crédito</span>
            </h1>
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition"
            >
              Ver Histórico
            </button>
          </div>

          <p className="mt-3 text-slate-300 max-w-xl text-sm sm:text-base">
            Envie um ou vários arquivos para processamento, validação e
            ingestão automática na MedSimples.
          </p>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* ESQUERDA – explicações */}
          <div className="flex flex-col justify-between">
            <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-7 backdrop-blur shadow-lg shadow-sky-900/30">
              <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 text-sm">
                  1
                </span>
                Como funciona o processamento
              </h2>

              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-500/15 border border-sky-500/60 flex items-center justify-center text-[10px]">
                    ①
                  </span>
                  <div>
                    <p className="font-medium text-slate-100">
                      Upload de múltiplos arquivos
                    </p>
                    <p className="text-slate-400">
                      Agora você pode enviar vários arquivos ao mesmo tempo.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-500/15 border border-sky-500/60 flex items-center justify-center text-[10px]">
                    ②
                  </span>
                  <div>
                    <p className="font-medium text-slate-100">
                      Validação & consistência
                    </p>
                    <p className="text-slate-400">
                      O backend verifica estrutura e dados de cada arquivo.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-500/15 border border-sky-500/60 flex items-center justify-center text-[10px]">
                    ③
                  </span>
                  <div>
                    <p className="font-medium text-slate-100">
                      Resumo por arquivo
                    </p>
                    <p className="text-slate-400">
                      Cada arquivo retorna um relatório individual.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Status */}
            <div className="grid sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Arquivos selecionados</p>
                <p className="font-semibold text-sky-300 truncate">
                  {humanFileInfo}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Status atual</p>
                <p className="font-semibold">
                  {loading
                    ? "Processando..."
                    : results.length > 0
                    ? "Concluído"
                    : "Aguardando upload"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Próximo passo</p>
                <p className="font-semibold text-emerald-300">
                  {results.length > 0
                    ? "Revisar retorno"
                    : "Selecionar arquivos"}
                </p>
              </div>
            </div>
          </div>

          {/* DIREITA – upload */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-sky-900/40 p-6 sm:p-7 backdrop-blur">
              <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-sm">
                  ↑
                </span>
                Enviar arquivos (.xlsx, .csv, etc)
              </h2>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl px-4 py-8 sm:px-6 sm:py-10 cursor-pointer transition ${
                  dragging
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-slate-700 bg-slate-900/60 hover:border-sky-500/80 hover:bg-slate-900/80"
                }`}
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
                        ? `${files.length} arquivo(s) pronto(s)`
                        : "Arraste ou clique para selecionar vários arquivos"}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Aceita múltiplos formatos{" "}
                      <span className="font-semibold text-sky-300">
                        .xlsx, .csv, .txt…
                      </span>
                    </p>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-2 inline-flex flex-col items-center gap-1 bg-slate-900/90 border border-slate-700 px-3 py-2 rounded-2xl text-xs text-slate-200 max-h-28 overflow-auto">
                      {files.map((f) => (
                        <span key={f.name} className="truncate max-w-[240px]">
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={upload}
                  disabled={files.length === 0 || loading}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition w-full sm:w-auto ${
                    files.length === 0 || loading
                      ? "bg-sky-500/40 text-slate-200 cursor-not-allowed"
                      : "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-900/40"
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-slate-950/10 border-t-slate-950 animate-spin" />
                      Processando arquivos...
                    </>
                  ) : (
                    <>Enviar para processamento</>
                  )}
                </button>

                <p className="text-[11px] sm:text-xs text-slate-400">
                  Todos os arquivos serão enviados individualmente.
                </p>
              </div>

              {/* Barra de progresso */}
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
                  <div
                    key={index}
                    className="rounded-3xl bg-slate-950/80 border border-slate-800 shadow-lg shadow-slate-900/60 p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-100">
                        Resultado — {res.file}
                      </h3>
                      <span
                        className={`text-[11px] px-2 py-1 rounded-full ${
                          res.error
                            ? "bg-rose-800/40 text-rose-300"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {res.error ? "Erro" : "OK"}
                      </span>
                    </div>

                    {!res.error && (
                      <div className="mb-3 text-xs sm:text-sm text-slate-300">
                        <p>
                          <span className="text-slate-400">Arquivo: </span>
                          <span className="text-sky-300 font-medium">
                            {res.data && res.data.arquivo ? res.data.arquivo : "—"}
                          </span>
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() =>
                        setShowLogIndex(
                          showLogIndex === index ? null : index
                        )
                      }
                      className="text-sky-300 text-xs font-medium hover:underline transition"
                    >
                      {showLogIndex === index
                        ? "Ocultar log ▲"
                        : "Ver log detalhado ▼"}
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
      </div>

      <style>
        {`
        @keyframes pulse {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        `}
      </style>

      <HistoricoModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
