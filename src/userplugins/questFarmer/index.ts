/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

const scriptCode = `
delete window.$;
let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();

let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata).exports.A;
let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getRunningGames).exports.Ay;
let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest).exports.A;
let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent).exports.A;
let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getSFWDefaultChannel).exports.Ay;
let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue).exports.h;
let api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get).exports.Bo;

const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"]
let quests = [...QuestsStore.quests.values()].filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now() && supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y)))
let isApp = typeof DiscordNative !== "undefined"
if(quests.length === 0) {
	console.log("You don't have any uncompleted quests!")
} else {
	let doJob = function() {
		const quest = quests.pop()
		if(!quest) return

		const pid = Math.floor(Math.random() * 30000) + 1000

		const applicationId = quest.config.application.id
		const applicationName = quest.config.application.name
		const questName = quest.config.messages.questName
		const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2
		const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null)
		const secondsNeeded = taskConfig.tasks[taskName].target
		let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0

		if(taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
			const speed = 7
			const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime()
			let completed = false
			let fn = async () => {
				while(true) {
					const remaining = Math.min(speed, secondsNeeded - secondsDone)
					await new Promise(resolve => setTimeout(resolve, remaining * 1000))

					const timestamp = secondsDone + speed
					const res = await api.post({url: \`/quests/\${quest.id}/video-progress\`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}})
					completed = res.body.completed_at != null
					secondsDone = Math.min(secondsNeeded, timestamp)

					if(timestamp >= secondsNeeded) {
						break
					}
				}
				if(!completed) {
					await api.post({url: \`/quests/\${quest.id}/video-progress\`, body: {timestamp: secondsNeeded}})
				}
				console.log("Quest completed!")
				doJob()
			}
			fn()
			console.log(\`Spoofing video for \${questName}.\`)
		} else if(taskName === "PLAY_ON_DESKTOP") {
			if(!isApp) {
				console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!")
			} else {
				api.get({url: \`/applications/public?application_ids=\${applicationId}\`}).then(res => {
					const appData = res.body[0]
					const exeName = appData.executables?.find(x => x.os === "win32")?.name?.replace(">","") ?? appData.name.replace(/[\\/\\\\:*?"<>|]/g, "")

					const fakeGame = {
						cmdLine: \`C:\\\\Program Files\\\\\${appData.name}\\\\\${exeName}\`,
						exeName,
						exePath: \`c:/program files/\${appData.name.toLowerCase()}/\${exeName}\`,
						hidden: false,
						isLauncher: false,
						id: applicationId,
						name: appData.name,
						pid: pid,
						pidPath: [pid],
						processName: appData.name,
						start: Date.now(),
					}
					const realGames = RunningGameStore.getRunningGames()
					const fakeGames = [fakeGame]
					const realGetRunningGames = RunningGameStore.getRunningGames
					const realGetGameForPID = RunningGameStore.getGameForPID
					RunningGameStore.getRunningGames = () => fakeGames
					RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid)
					FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames})

					let fn = data => {
						let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value)
						console.log(\`Quest progress: \${progress}/\${secondsNeeded}\`)

						if(progress >= secondsNeeded) {
							console.log("Quest completed!")

							RunningGameStore.getRunningGames = realGetRunningGames
							RunningGameStore.getGameForPID = realGetGameForPID
							FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []})
							FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

							doJob()
						}
					}
					FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

					console.log(\`Spoofed your game to \${applicationName}. Wait for \${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.\`)
				})
			}
		} else if(taskName === "STREAM_ON_DESKTOP") {
			if(!isApp) {
				console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!")
			} else {
				let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata
				ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
					id: applicationId,
					pid,
					sourceName: null
				})

				let fn = data => {
					let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value)
					console.log(\`Quest progress: \${progress}/\${secondsNeeded}\`)

					if(progress >= secondsNeeded) {
						console.log("Quest completed!")

						ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc
						FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

						doJob()
					}
				}
				FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

				console.log(\`Spoofed your stream to \${applicationName}. Stream any window in vc for \${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.\`)
				console.log("Remember that you need at least 1 other person to be in the vc!")
			}
		} else if(taskName === "PLAY_ACTIVITY") {
			const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id
			const streamKey = \`call:\${channelId}:1\`

			let fn = async () => {
				console.log("Completing quest", questName, "-", quest.config.messages.questName)

				while(true) {
					const res = await api.post({url: \`/quests/\${quest.id}/heartbeat\`, body: {stream_key: streamKey, terminal: false}})
					const progress = res.body.progress.PLAY_ACTIVITY.value
					console.log(\`Quest progress: \${progress}/\${secondsNeeded}\`)

					await new Promise(resolve => setTimeout(resolve, 20 * 1000))

					if(progress >= secondsNeeded) {
						await api.post({url: \`/quests/\${quest.id}/heartbeat\`, body: {stream_key: streamKey, terminal: true}})
						break
					}
				}

				console.log("Quest completed!")
				doJob()
			}
			fn()
		}
	}
	doJob()
}
`;

export default definePlugin({
    name: "QuestFarmer",
    description: "Injeta um botão para farmar Quests automaticamente via script.",
    authors: [{ name: "gecko", id: 2648308372777205n }],

    start() {
        if (!document.getElementById("btn-quest-farmer")) {
            const btn = document.createElement("button");
            btn.id = "btn-quest-farmer";
            btn.innerText = "Farmar Quest";

            // Estilos para um botão flutuante no canto inferior direito
            btn.style.position = "fixed";
            btn.style.bottom = "24px";
            btn.style.right = "24px";
            btn.style.zIndex = "999999"; // Para ficar por cima de tudo
            btn.style.backgroundColor = "#5865F2";
            btn.style.color = "white";
            btn.style.border = "none";
            btn.style.padding = "12px 24px";
            btn.style.borderRadius = "8px";
            btn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.4)";
            btn.style.cursor = "pointer";
            btn.style.fontWeight = "bold";
            btn.style.fontSize = "16px";
            btn.style.transition = "all 0.2s ease";
            btn.style.display = "none"; // Começa escondido

            btn.onmouseover = () => {
                btn.style.backgroundColor = "#4752C4";
                btn.style.transform = "scale(1.05)";
            };
            btn.onmouseout = () => {
                btn.style.backgroundColor = "#5865F2";
                btn.style.transform = "scale(1)";
            };

            btn.onclick = () => {
                console.log("[QuestFarmer] Executando script...");
                (0, eval)(scriptCode);

                const originalText = btn.innerText;
                btn.innerText = "Executando...";
                btn.style.backgroundColor = "#3BA55D";

                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.backgroundColor = "#5865F2";
                }, 3000);
            };

            document.body.appendChild(btn);

            // Checa a cada meio segundo se o usuário está na aba de Quests
            // @ts-expect-error - Guardamos a referência do intervals
            this.interval = setInterval(() => {
                const path = window.location.pathname.toLowerCase();
                const isQuestsTab = path.includes("quest") ||
                    path.includes("discovery") ||
                    document.querySelector('[aria-label*="Quest" i]') !== null ||
                    document.querySelector('[aria-label*="Miss" i]') !== null;

                if (isQuestsTab) {
                    if (btn.style.display === "none") {
                        btn.style.display = "block";
                        // Animação suave de entrada
                        btn.animate([
                            { opacity: 0, transform: "translateY(20px)" },
                            { opacity: 1, transform: "translateY(0)" }
                        ], { duration: 300, fill: "forwards" });
                    }
                } else {
                    btn.style.display = "none";
                }
            }, 500);
        }
    },

    stop() {
        // @ts-expect-error - Referência do interval
        if (this.interval) clearInterval(this.interval);
        document.getElementById("btn-quest-farmer")?.remove();
    }
});
