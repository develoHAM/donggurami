import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GameCanvasHandle, GameCanvasProps, GameEvent } from './GameCanvas.types';

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ html, width, height, onEvent }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const send = (cmd: string) =>
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ cmd }), '*');

    useImperativeHandle(ref, () => ({
      pause: () => send('pause'),
      resume: () => send('resume'),
      restart: () => send('restart'),
    }));

    useEffect(() => {
      const onMessage = (e: MessageEvent) => {
        if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
        let data: unknown = e.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch { return; }
        }
        if (data && typeof data === 'object' && 'type' in data) {
          onEvent(data as GameEvent);
        }
      };
      window.addEventListener('message', onMessage);
      return () => window.removeEventListener('message', onMessage);
    }, [onEvent]);

    return (
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title="suika"
        width={width}
        height={height}
        onLoad={() => send('hello')}
        style={{ border: 'none', background: '#FDF6E3' }}
      />
    );
  },
);
GameCanvas.displayName = 'GameCanvas';
