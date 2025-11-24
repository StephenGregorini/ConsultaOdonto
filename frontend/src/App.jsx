import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("https://SEU-BACKEND.railway.app/upload", {
      method: "POST",
      body: form,
    });

    const json = await res.json();
    setResult(json);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-xl mx-auto">

      <h1 className="text-3xl font-bold mb-6">
        Upload de Dados — Controle Odonto
      </h1>

      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setFile(e.target.files?.[0])}
        className="mb-4"
      />

      <button
        onClick={upload}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Processando..." : "Enviar"}
      </button>

      {result && (
        <pre className="bg-gray-200 p-4 mt-6 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
