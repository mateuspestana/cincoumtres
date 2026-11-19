// O desenho do Congresso do mood.png: cúpula do Senado, as duas torres, a concha da Câmara e a
// linha de base comprida. O ponto laranja do wordmark é o mesmo laranja do cursor do tempo.

export function Simbolo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      <path d="M4 56a20 20 0 0 1 40 0z" fill="currentColor" />
      <rect x="49" y="4" width="8" height="52" fill="currentColor" />
      <rect x="60" y="4" width="8" height="52" fill="currentColor" />
      <path d="M76 39h38a19 17 0 0 1-38 0z" fill="currentColor" />
      <rect x="0" y="56" width="120" height="2.6" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wordmark ${className ?? ''}`}>
      <Simbolo className="wordmark__simbolo" />
      <span className="wordmark__texto">cincoumtrês<span className="wordmark__ponto">.</span></span>
    </span>
  );
}
