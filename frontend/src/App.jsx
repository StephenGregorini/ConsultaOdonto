import React from "react";
import { useState, useRef, useMemo } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const upload = async () => {
    if (!file || loading) return;

    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({
        error: "Erro ao se comunicar com o servidor.",
        details: String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const humanFileInfo = useMemo(() => {
    if (!file) return null;
    const kb = file.size / 1024;
    const size = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`;
    return `${file.name} • ${size}`;
  }, [file]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-16">

        {/* BADGE */}
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/30 px-4 py-1 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-sky-200">
            Controle Odonto · Ingestão de dados
          </span>
        </div>

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
              Upload inteligente{" "}
              <span className="text-sky-400">de produção odontológica</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl">
              Envie o arquivo de produção em <span className="font-medium">.xlsx</span> e
              deixe o motor do Controle Odonto validar e estruturar os dados.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
            <div className="rounded-xl bg-slate-900/70 border border-slate-700 px-4 py-2">
              <p className="text-slate-400">Status da integração</p>
              <p className="font-semibold text-emerald-400">Online</p>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-700 px-4 py-2">
              <p className="text-slate-400">Formato esperado</p>
              <p className="font-semibold text-sky-300">Excel · .xlsx</p>
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* ESQUERDA */}
          <div className="space-y-6">

            {/* ETAPAS */}
            <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-7 backdrop-blur shadow-lg shadow-sky-900/30">
              <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 text-sm">
                  1
                </span>
                Como funciona o processamento
              </h2>

              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-500/15 border border-sky-500/60 flex items-center justify-center text-[10px]">①</span>
                  <div>
                    <p className="font-medium text-slate-100">Upload do Excel</p>
                    <p className="text-slate-400">Selecione o arquivo contendo a produção.</p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-500/15 border border-sky-500/60 flex items-center justify-center text-[10px]">②</span>
                  <div>
                    <p className="font-medium text-slate-100">Validação & consistência</p>
                    <p className="text-slate-400">O backend confere a estrutura e os dados.</p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-500/15 border border-sky-500/60 flex items-center justify-center text-[10px]">③</span>
                  <div>
                    <p className="font-medium text-slate-100">Resumo estruturado</p>
                    <p className="text-slate-400">Retornamos um resumo da ingestão para validação.</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* CAIXAS DE STATUS */}
            <div className="grid sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Último arquivo</p>
                <p className="font-semibold text-sky-300 truncate">
                  {humanFileInfo || "Nenhum selecionado"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Status atual</p>
                <p className="font-semibold">
                  {loading ? "Processando..." : result ? "Concluído" : "Aguardando upload"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Próximo passo</p>
                <p className="font-semibold text-emerald-300">
                  {result ? "Revisar resultado" : "Selecionar arquivo"}
                </p>
              </div>
            </div>
          </div>

          {/* DIREITA */}
          <div className="space-y-6">

            {/* UPLOAD CARD */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-sky-900/40 p-6 sm:p-7 backdrop-blur">
              <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-sm">
                  ↑
                </span>
                Enviar arquivo de produção (.xlsx)
              </h2>

              {/* DROPZONE */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl px-4 py-8 sm:px-6 sm:py-10 cursor-pointer transition 
                ${
                  dragging
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-slate-700 bg-slate-900/60 hover:border-sky-500/80 hover:bg-slate-900/80"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
                      {file
                        ? "Arquivo pronto para envio"
                        : "Arraste o arquivo aqui ou clique para selecionar"}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Aceita apenas arquivos Excel{" "}
                      <span className="font-semibold text-sky-300">.xlsx</span>.
                    </p>
                  </div>

                  {file && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700 px-3 py-1.5 text-xs text-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="truncate max-w-[210px] sm:max-w-[260px]">
                        {humanFileInfo}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTÃO */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={upload}
                  disabled={!file || loading}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition w-full sm:w-auto
                  ${
                    !file || loading
                      ? "bg-sky-500/40 text-slate-200 cursor-not-allowed"
                      : "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-900/40"
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-slate-950/10 border-t-slate-950 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>Enviar para processamento</>
                  )}
                </button>

                <p className="text-[11px] sm:text-xs text-slate-400">
                  Os dados são usados apenas para cálculo de remuneração.
                </p>
              </div>

              {/* PROGRESSO */}
              {loading && (
                <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-500 animate-[pulse_1.4s_ease-in-out_infinite]" />
                </div>
              )}
            </div>

            {/* RESULTADO */}
            {result && (
              <div className="rounded-3xl bg-slate-950/80 border border-slate-800 shadow-lg shadow-slate-900/60 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-100">
                    Resultado do processamento
                  </h3>

                  <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                    Retorno da API
                  </span>
                </div>

                {/* CHIPS */}
                <div className="flex flex-wrap gap-2 mb-4 text-[11px] sm:text-xs">
                  {"total_linhas" in result && (
                    <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                      Linhas lidas:{" "}
                      <span className="font-semibold text-sky-300">
                        {result.total_linhas}
                      </span>
                    </span>
                  )}

                  {"erros" in result &&
                    Array.isArray(result.erros) && (
                      <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                        Erros:{" "}
                        <span className="font-semibold text-rose-300">
                          {result.erros.length}
                        </span>
                      </span>
                    )}

                  {"avisos" in result &&
                    Array.isArray(result.avisos) && (
                      <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                        Avisos:{" "}
                        <span className="font-semibold text-amber-300">
                          {result.avisos.length}
                        </span>
                      </span>
                    )}

                  {"arquivo" in result && (
                    <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200 truncate max-w-[220px]">
                      Arquivo:{" "}
                      <span className="font-semibold text-sky-300">
                        {String(result.arquivo)}
                      </span>
                    </span>
                  )}
                </div>

                {/* JSON RAW */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 max-h-64 overflow-auto text-[11px] sm:text-xs">
                  <pre className="p-3 text-slate-200 whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KEYFRAMES SEGUROS VIA TAILWIND */}
      <style>
        {`
        @keyframes pulse {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        `}
      </style>
    </div>
  );
}
