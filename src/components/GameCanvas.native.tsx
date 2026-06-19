import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { GameCanvasHandle, GameCanvasProps, GameEvent } from './GameCanvas.types';

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ html, width, height, onEvent, style }, ref) => {
    const webRef = useRef<WebView>(null);

    // cmd is restricted to a literal union so the injected string is never attacker-controlled.
    const run = (cmd: 'pause' | 'resume' | 'restart') => {
      webRef.current?.injectJavaScript(`window.__suika && window.__suika.${cmd}(); true;`);
    };

    useImperativeHandle(ref, () => ({
      pause: () => run('pause'),
      resume: () => run('resume'),
      restart: () => run('restart'),
    }));

    const handleMessage = (e: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(e.nativeEvent.data) as GameEvent;
        if (data && 'type' in data) onEvent(data);
      } catch {
        /* ignore malformed */
      }
    };

    return (
      <WebView
        ref={webRef}
        source={{ html }}
        style={[{ width, height, backgroundColor: '#FDF6E3' }, style]}
        originWhitelist={['*']}
        scrollEnabled={false}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        setBuiltInZoomControls={false}
      />
    );
  },
);
GameCanvas.displayName = 'GameCanvas';
