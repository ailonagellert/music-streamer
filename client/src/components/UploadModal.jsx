import React, { useState, useRef, useCallback } from 'react';
import api from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtSize  = (b) => b < 1024*1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/1024/1024).toFixed(1)} MB`;
const fmtName  = (n) => n.length > 36 ? n.slice(0, 33) + '…' : n;

const STATUS = { QUEUED: 'queued', UPLOADING: 'uploading', DONE: 'done', ERROR: 'error' };

// ─── UploadModal ─────────────────────────────────────────────────────────────

const UploadModal = ({ isOpen, onClose, onUploaded }) => {
  const [files, setFiles]   = useState([]); // [{ id, file, status, progress, result, error }]
  const [dragging, setDrag] = useState(false);
  const inputRef            = useRef(null);

  if (!isOpen) return null;

  // ── File ingestion ──────────────────────────────────────────────────────────
  const addFiles = (incoming) => {
    const mp3s = Array.from(incoming).filter(
      f => f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3')
    );
    if (!mp3s.length) return;
    setFiles(prev => [
      ...prev,
      ...mp3s
        .filter(f => !prev.some(p => p.file.name === f.name && p.file.size === f.size))
        .map(f => ({ id: Math.random().toString(36).slice(2), file: f, status: STATUS.QUEUED, progress: 0, result: null, error: null }))
    ]);
  };

  // ── Drag events ─────────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setDrag(true); };
  const onDragLeave = ()  => setDrag(false);
  const onDrop      = (e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); };

  // ── Upload one file ─────────────────────────────────────────────────────────
  const uploadOne = (item) => new Promise((resolve) => {
    const form = new FormData();
    form.append('track', item.file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct, status: STATUS.UPLOADING } : f));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: STATUS.DONE, progress: 100, result } : f));
        resolve({ ok: true, result });
      } else {
        const msg = (() => { try { return JSON.parse(xhr.responseText).error; } catch { return xhr.statusText; } })();
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: STATUS.ERROR, error: msg } : f));
        resolve({ ok: false });
      }
    };

    xhr.onerror = () => {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: STATUS.ERROR, error: 'Network error' } : f));
      resolve({ ok: false });
    };

    xhr.send(form);
  });

  // ── Upload all queued ───────────────────────────────────────────────────────
  const uploadAll = async () => {
    const queued = files.filter(f => f.status === STATUS.QUEUED);
    let addedCount = 0;
    for (const item of queued) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: STATUS.UPLOADING } : f));
      const res = await uploadOne(item);
      if (res.ok) addedCount++;
    }
    if (addedCount > 0) onUploaded(); // refresh library
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const clearDone  = ()   => setFiles(prev => prev.filter(f => f.status !== STATUS.DONE));
  const retryErrors = ()  => setFiles(prev => prev.map(f => f.status === STATUS.ERROR ? { ...f, status: STATUS.QUEUED, progress: 0, error: null } : f));

  const queued    = files.filter(f => f.status === STATUS.QUEUED).length;
  const uploading = files.filter(f => f.status === STATUS.UPLOADING).length;
  const done      = files.filter(f => f.status === STATUS.DONE).length;
  const errors    = files.filter(f => f.status === STATUS.ERROR).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel upload-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>📤</span>
            <h2 className="modal-title">Upload MP3s</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Drop zone */}
        <div
          className={`drop-zone ${dragging ? 'drop-zone-active' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            multiple
            style={{ display: 'none' }}
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />
          <span className="drop-icon">{dragging ? '📂' : '💩'}</span>
          <p className="drop-title">{dragging ? 'Drop it!' : 'Drop MP3s here'}</p>
          <p className="drop-sub">or click to browse — multiple files OK</p>
        </div>

        {/* File queue */}
        {files.length > 0 && (
          <>
            {/* Stats bar */}
            <div className="upload-stats">
              {queued > 0    && <span className="stat stat-queued">{queued} queued</span>}
              {uploading > 0 && <span className="stat stat-up">{uploading} uploading</span>}
              {done > 0      && <span className="stat stat-done">{done} done</span>}
              {errors > 0    && <span className="stat stat-err">{errors} failed</span>}
              <div style={{ flex: 1 }} />
              {done > 0   && <button className="btn-clear" onClick={clearDone}>Clear done</button>}
              {errors > 0 && <button className="btn-retry" onClick={retryErrors}>Retry failed</button>}
            </div>

            {/* File rows */}
            <div className="file-list">
              {files.map(item => (
                <div key={item.id} className={`file-row file-row-${item.status}`}>
                  <span className="file-status-icon">
                    {item.status === STATUS.QUEUED    && '⏳'}
                    {item.status === STATUS.UPLOADING && '⬆️'}
                    {item.status === STATUS.DONE      && '✅'}
                    {item.status === STATUS.ERROR     && '❌'}
                  </span>

                  <div className="file-info">
                    <div className="file-name">{fmtName(item.file.name)}</div>
                    {item.status === STATUS.DONE && item.result && (
                      <div className="file-meta-result">
                        {item.result.title} — {item.result.artist}
                      </div>
                    )}
                    {item.status === STATUS.ERROR && (
                      <div className="file-error">{item.error}</div>
                    )}
                    {item.status === STATUS.UPLOADING && (
                      <div className="file-progress-wrap">
                        <div className="file-progress-bar" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.status === STATUS.QUEUED && (
                      <div className="file-size">{fmtSize(item.file.size)}</div>
                    )}
                  </div>

                  {(item.status === STATUS.QUEUED || item.status === STATUS.ERROR) && (
                    <button className="btn-remove" onClick={() => removeFile(item.id)} title="Remove">✕</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer actions */}
        <div className="upload-footer">
          {queued === 0 && files.length === 0 && (
            <p className="upload-empty-hint">Add some MP3 files above to get started.</p>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel-sm" onClick={onClose}>
            {done > 0 && queued === 0 ? 'Close' : 'Cancel'}
          </button>
          {queued > 0 && (
            <button className="btn-upload-go" onClick={uploadAll} disabled={uploading > 0}>
              {uploading > 0 ? `Uploading…` : `⬆️ Upload ${queued} file${queued > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default UploadModal;
