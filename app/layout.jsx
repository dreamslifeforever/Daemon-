import './globals.css';
import TabNav from '@/components/TabNav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Daeman — an in-browser runtime for autonomous AI agents',
  description:
    'Spin up an AI agent, give it a goal, and watch it think, call tools, and work — step by step, live in your browser. No keys, nothing leaves your tab.',
  metadataBase: new URL('https://daeman.fun'),
  openGraph: {
    title: 'Daeman — run AI agents in your browser',
    description: 'Give an agent a goal. Watch it work. A live agent runtime, on Solana.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app">
          <TabNav />
          <main className="app__main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
