import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase, DRAFTS_BUCKET } from "../supabaseClient";

// Cross-browser fullscreen helpers (Safari on macOS still needs the webkit prefix).
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsSupported = () => document.fullscreenEnabled || document.webkitFullscreenEnabled;
const enterFs = (el) => (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
const exitFs = () => (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);

export default function DraftPreviewModal({ draftFile, onClose }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [error, setError] = useState("");
  const [isFs, setIsFs] = useState(false);
  const modalRef = useRef(null);

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

  // Track fullscreen so the button icon/label reflect the real state, including
  // when the user exits with Esc rather than the button.
  useEffect(() => {
    const onChange = () => setIsFs(fsElement() === modalRef.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (fsElement()) exitFs();
    else if (modalRef.current) enterFs(modalRef.current);
  };

  const isImage = draftFile.type?.startsWith("image/");
  const isPdf = draftFile.type === "application/pdf";
  const isText = draftFile.type?.startsWith("text/");

  return createPortal(
    <div className="draft-modal-backdrop modal-backdrop-opening" onClick={onClose}>
      <div
        ref={modalRef}
        className={`draft-modal ${isFs ? "draft-modal--fs" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="draft-modal-header">
          <span className="draft-modal-title">{draftFile.name}</span>
          <div className="draft-modal-actions">
            {fsSupported() && (
              <button
                className="draft-modal-icon-btn"
                onClick={toggleFullscreen}
                aria-label={isFs ? "Exit fullscreen" : "View fullscreen"}
                title={isFs ? "Exit fullscreen" : "View fullscreen"}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {isFs ? (
                    <>
                      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                    </>
                  ) : (
                    <>
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    </>
                  )}
                </svg>
              </button>
            )}
            <button className="draft-modal-close" onClick={onClose} aria-label="Close preview">
              ✕
            </button>
          </div>
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
