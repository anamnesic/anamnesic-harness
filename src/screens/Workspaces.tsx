'use client';

import { motion } from 'motion/react';
import { Projects } from './Repo';

export function Workspaces() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-5xl mx-auto w-full"
        >
            <div className="mb-10 space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Repositórios</h2>
                <p className="text-sm text-text-dim">
                    A seleção de um único repositório fica no contexto global de todo o aplicativo.
                </p>
            </div>

            <Projects embedded />
        </motion.div>
    );
}
