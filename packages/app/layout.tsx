import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Kairos',
    description: 'Persistent, proactive AI agent with continuous memory, observation, and autonomous action.',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Kairos',
    },
};

export const viewport: Viewport = {
    themeColor: '#09090b',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

import { Providers } from './providers';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="bg-bg antialiased selection:bg-primary/20">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
