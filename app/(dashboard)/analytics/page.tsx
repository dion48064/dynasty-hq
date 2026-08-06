"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface LeagueDocument {
  id: string;
  name: string;
  category: string;
  fileUrl: string;
  uploadedAt: string;
}

const ADMIN_TEAM = "Hampton Inn";

export default function LeagueAnalyticsPage(): import("react").JSX.Element {
  const { currentUser } = useAuth();
  const isAdmin = currentUser === ADMIN_TEAM;

  const [documents, setDocuments] = useState<LeagueDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('By-Laws');
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch('/api/league-data');
        if (res.ok) {
          const data = await res.json();
          if (data && data.documents) {
            setDocuments(data.documents);
          }
        }
      } catch (e) {
        console.error("Failed to load documents", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDocs();
  }, []);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !titleInput.trim()) return;

    setIsUploading(true);
    try {
      const newDoc: LeagueDocument = {
        id: Date.now().toString(),
        name: titleInput,
        category: categoryInput,
        fileUrl: urlInput.trim(),
        uploadedAt: new Date().toLocaleDateString()
      };

      const updatedDocs = [newDoc, ...documents];

      const getRes = await fetch('/api/league-data');
      const currentDb = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...currentDb,
        documents: updatedDocs
      };

      const putRes = await fetch('/api/league-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (putRes.ok) {
        setDocuments(updatedDocs);
        setTitleInput('');
        setUrlInput('');
      } else {
        alert("Failed to save document to cloud database.");
      }
    } catch (err) {
      console.error("Save error", err);
      alert("Error saving document link.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const updatedDocs = documents.filter(d => d.id !== id);
      
      const getRes = await fetch('/api/league-data');
      const currentDb = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...currentDb,
        documents: updatedDocs
      };

      const putRes = await fetch('/api/league-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (putRes.ok) {
        setDocuments(updatedDocs);
      } else {
        alert("Failed to delete document.");
      }
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League Analytics & Documents 📊</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-xs">
          Access official league files, constitution records, and analytical reports.
        </p>
      </div>

      {/* ADMIN ADD LINK SECTION */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Document Link</h2>
          </div>

          <form onSubmit={handleAddDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Document Title</label>
              <input
                type="text"
                placeholder="e.g. 2026 League Constitution"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Category</label>
              <select
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              >
                <option value="By-Laws">By-Laws & Constitution</option>
                <option value="Financials">Financials & Payouts</option>
                <option value="Analytics">Analytics & Data Reports</option>
                <option value="Other">Other Documents</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">External Link URL</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isUploading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
              >
                {isUploading ? 'Saving...' : 'Add Document Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENTS LIST */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          📁 League Document Library
        </h2>

        {documents.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-6">No documents added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      {doc.category}
                    </span>
                    <span className="text-[10px] text-gray-400">{doc.uploadedAt}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{doc.name}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Open Link ↗
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="px-2 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold rounded-lg"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}