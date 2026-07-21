import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase, DRAFTS_BUCKET } from "../supabaseClient";

export default function DraftPreviewModal({ draftFile, onClose }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    setError("");
    supabase.storage
      .from(DRAFTS_BUCKET)
      .createSignedUrl(draftFile.path, 300)
      .then(({ data, error: signError }) => {
        if (cancelled) return;
        if (signError) setError(signError.message);
        else setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [draftFile.path]);

  const isImage = draftFile.type?.startsWith("image/");
  const isPdf = draftFile.type === "application/pdf";
  const isText = draftFile.type?.startsWith("text/");

  return createPortal(
    <div className="draft-modal-backdrop modal-backdrop-opening" onClick={onClose}>
      <div className="draft-modal" onClick={(e) => e.stopPropagation()}>
        <div className="draft-modal-header">
          <span className="draft-modal-title">{draftFile.name}</span>
          <button className="draft-modal-close" onClick={onClose} aria-label="Close preview">
            ✕
          </button>
        </div>
        <div className="draft-modal-body">
          {error && (
            <div className="draft-preview-fallback">
              <span className="draft-preview-fallback-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}
          {!error && !signedUrl && <p className="draft-preview-loading">Loading preview…</p>}
          {!error && signedUrl && isImage && (
            <img src={signedUrl} alt={draftFile.name} className="draft-preview-image" />
          )}
          {!error && signedUrl && (isPdf || isText) && (
            <iframe src={signedUrl} title={draftFile.name} className="draft-preview-frame" />
          )}
          {!error && signedUrl && !isImage && !isPdf && !isText && (
            <div className="draft-preview-fallback">
              <span className="draft-preview-fallback-icon">📄</span>
              <p>Preview isn't available for this file type.</p>
              <a className="btn btn--primary btn--sm" href={signedUrl} download={draftFile.name}>
                Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
