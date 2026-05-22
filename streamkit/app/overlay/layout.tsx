export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* OBS browser sources render this layout, so no body styles here */}
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: transparent !important; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; }
          @keyframes alert-in  { from { opacity:0; transform:translateY(50px) scale(.82); } to { opacity:1; transform:translateY(0) scale(1); } }
          @keyframes alert-out { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(-30px) scale(.93); } }
          @keyframes chat-in   { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:translateX(0); } }
          @keyframes label-in  { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:scale(1); } }
          @keyframes shimmer   { from { background-position:-200% center; } to { background-position:200% center; } }
          @keyframes live-pulse { 0%,100% { opacity:1; } 50% { opacity:.25; } }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
