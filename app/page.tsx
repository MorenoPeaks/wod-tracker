"use client";

import dynamic from "next/dynamic";

// L'app dipende da IndexedDB e dal browser: niente rendering lato server.
const App = dynamic(() => import("@/components/App"), {
  ssr: false,
  loading: () => (
    <div className="p-6 muted" role="status">
      Caricamento…
    </div>
  ),
});

export default function Page() {
  return <App />;
}
