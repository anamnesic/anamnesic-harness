import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Kairos',
    description: 'Persistent, proactive AI agent with continuous memory, observation, and autonomous action.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
