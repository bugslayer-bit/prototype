import React, { useState } from 'react';

interface UploadedDocument {
  id: string;
  filename: string;
  category: string;
  uploadDate: string;
  size: string;
  status: 'Uploaded' | 'Under Review' | 'Verified' | 'Rejected';
}

const MOCK_DOCUMENTS: UploadedDocument[] = [
  {
    id: "DOC001",
    filename: "Contractor_Registration_Form_2026.pdf",
    category: "Registration",
    uploadDate: "2026-03-15",
    size: "2.4 MB",
    status: "Verified",
  },
  {
    id: "DOC002",
    filename: "Business_License_Amendment.pdf",
    category: "Amendment",
    uploadDate: "2026-03-10",
    size: "1.8 MB",
    status: "Under Review",
  },
  {
    id: "DOC003",
    filename: "Invoice_March_2026.pdf",
    category: "Invoice",
    uploadDate: "2026-03-08",
    size: "0.6 MB",
    status: "Verified",
  },
  {
    id: "DOC004",
    filename: "PAN_Certificate_Support.pdf",
    category: "Supporting",
    uploadDate: "2026-02-28",
    size: "1.2 MB",
    status: "Rejected",
  },
];

const DOCUMENT_CATEGORIES = [
  { label: "Registration", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Amendment", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "Invoice", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Supporting", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const STATUS_CONFIG: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  "Uploaded": { icon: "cloud-upload", color: "text-slate-600", bgColor: "bg-slate-100", label: "Uploaded" },
  "Under Review": { icon: "hourglass", color: "text-amber-600", bgColor: "bg-amber-100", label: "Under Review" },
  "Verified": { icon: "check-circle", color: "text-emerald-600", bgColor: "bg-emerald-100", label: "Verified" },
  "Rejected": { icon: "x-circle", color: "text-rose-600", bgColor: "bg-rose-100", label: "Rejected" },
};

function StatusIcon({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  const cls = "h-4 w-4";

  switch (config.icon) {
    case "check-circle":
      return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>;
    case "hourglass":
      return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M6 2c-1.1 0-2 .9-2 2v3h2V4h12v3h2V4c0-1.1-.9-2-2-2H6zm12 5H6c-1.1 0-2 .9-2 2v3h2V9h12v3h2v-3c0-1.1-.9-2-2-2zm0 6H6v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2v3H8v-3h-2z" /></svg>;
    case "x-circle":
      return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.3 11.3l-1.4 1.4L12 13.4l-2.9 2.9-1.4-1.4L10.6 12 7.7 9.1l1.4-1.4L12 10.6l2.9-2.9 1.4 1.4L13.4 12l2.9 2.9z" /></svg>;
    default:
      return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /></svg>;
  }
}

export function PublicDocumentsPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>(MOCK_DOCUMENTS);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredDocuments = selectedCategory
    ? uploadedFiles.filter((doc) => doc.category === selectedCategory)
    : uploadedFiles;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Mock: Add new documents
      const newDocs = Array.from(files).map((file, idx) => ({
        id: `DOC${Date.now()}_${idx}`,
        filename: file.name,
        category: "Supporting",
        uploadDate: new Date().toISOString().split('T')[0],
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status: "Uploaded" as const,
      }));
      setUploadedFiles([...newDocs, ...uploadedFiles]);
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = DOCUMENT_CATEGORIES.find((c) => c.label === category);
    return cat ? cat.color : "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="grid gap-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-violet-50 to-violet-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-200 text-violet-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V9.75A2.25 2.25 0 016 7.5h12z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
            <p className="text-sm text-slate-600">Upload and manage your submission documents</p>
          </div>
        </div>
      </section>

      {/* ── Drag & Drop Upload Area ─────────────────────────── */}
      <section className={`rounded-xl border-2 border-dashed transition-all ${
        dragActive
          ? "border-violet-500 bg-violet-50 shadow-md"
          : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400"
      } p-8`}>
        <input
          type="file"
          multiple
          onChange={(e) => {
            const files = e.currentTarget.files;
            if (files && files.length > 0) {
              const newDocs = Array.from(files).map((file, idx) => ({
                id: `DOC${Date.now()}_${idx}`,
                filename: file.name,
                category: "Supporting",
                uploadDate: new Date().toISOString().split('T')[0],
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                status: "Uploaded" as const,
              }));
              setUploadedFiles([...newDocs, ...uploadedFiles]);
            }
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="hidden"
          id="file-upload"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        />

        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center justify-center">
            <div className={`h-12 w-12 rounded-xl mb-3 flex items-center justify-center transition-colors ${
              dragActive ? "bg-violet-200 text-violet-700" : "bg-slate-200 text-slate-600"
            }`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v10.5A2.25 2.25 0 006.75 22.5h10.5A2.25 2.25 0 0019.5 20.25V9.75a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l2.25-2.25m0 0l2.25 2.25m-2.25-2.25v6.75m6-10.5h.008v.008h-.008V7.5m2 0h.008v.008h-.008V7.5" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Drag files here or click to upload</h3>
            <p className="text-xs text-slate-500">PDF, Word, Excel, or image files (max 10 MB each)</p>
          </div>
        </label>
      </section>

      {/* ── Category Filter ─────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Filter by Category</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === null
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Documents
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setSelectedCategory(cat.label)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                selectedCategory === cat.label
                  ? `${cat.color} border-current`
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Document List ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Uploaded Documents ({filteredDocuments.length})
        </h2>

        {filteredDocuments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
            <svg className="h-12 w-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V9.75A2.25 2.25 0 016 7.5h12z" />
            </svg>
            <p className="text-sm text-slate-600">No documents in this category yet</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredDocuments.map((doc) => {
              const config = STATUS_CONFIG[doc.status];
              return (
                <div key={doc.id} className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <svg className="h-5 w-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{doc.filename}</p>
                          <p className="text-xs text-slate-500">Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(doc.category)}`}>
                          {doc.category}
                        </span>
                        <span className="text-xs text-slate-500">{doc.size}</span>
                      </div>
                    </div>

                    {/* Status and actions */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor}`}>
                        <StatusIcon status={doc.status} />
                        <span className={`text-xs font-semibold ${config.color}`}>{doc.status}</span>
                      </div>

                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                          title="Download">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-rose-600"
                          title="Delete">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Summary Stats ──────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium">Total Documents</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{uploadedFiles.length}</p>
        </div>

        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = uploadedFiles.filter((d) => d.status === status).length;
          return (
            <div key={status} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className={`text-xs font-medium ${config.color}`}>{status}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
            </div>
          );
        })}
      </section>

      {/* ── Info Banner ─────────────────────────────────────── */}
      <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex gap-3">
          <svg className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <div className="text-sm text-slate-700">
            <p className="font-semibold mb-1">Document Upload Guidelines</p>
            <ul className="text-xs space-y-0.5 text-slate-600">
              <li>- Documents must be clearly legible and properly scanned</li>
              <li>- Accepted formats: PDF, Word, Excel, JPG, PNG</li>
              <li>- Maximum file size: 10 MB per document</li>
              <li>- Verified documents are approved and recorded in the system</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
