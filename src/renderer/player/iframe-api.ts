// Loads YouTube's IFrame Player API script once.
let loading: Promise<void> | null = null;

export function loadIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      loading = null;
      reject(new Error('The YouTube IFrame Player API did not load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}
