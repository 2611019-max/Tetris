import { Game } from './game.js';
import { NetworkManager } from './network.js';
import { COLS, ROWS, BLOCK_SIZE } from './constants.js';

window.addEventListener('DOMContentLoaded', () => {
    // Canvas elements
    const boardCanvas = document.getElementById('board');
    const nextCanvas = document.getElementById('next');
    const holdCanvas = document.getElementById('hold');
    const opponentCanvas = document.getElementById('opponent-board');

    // UI elements
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');
    const highScoreContainer = document.getElementById('high-score-container');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');
    const playerLabel = document.getElementById('player-label');

    // Mode Navigation
    const navSolo = document.getElementById('nav-solo');
    const navBattle = document.getElementById('nav-battle');
    const btnHowToPlay = document.getElementById('btn-how-to-play');

    // Instructions / Start Modal
    const instructionsModal = document.getElementById('instructions-modal');
    const btnStartGame = document.getElementById('btn-start-game');

    // Overlays
    const pauseOverlay = document.getElementById('pause-overlay');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScoreEl = document.getElementById('final-score');
    const finalHighScoreEl = document.getElementById('final-high-score');

    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');

    const battleResultOverlay = document.getElementById('battle-result-overlay');
    const battleResultTitle = document.getElementById('battle-result-title');
    const battleResultSub = document.getElementById('battle-result-sub');
    const btnRematch = document.getElementById('btn-rematch');
    const btnLeaveBattle = document.getElementById('btn-leave-battle');

    // Garbage Meter
    const garbageMeter = document.getElementById('garbage-meter');
    const garbageMeterFill = document.getElementById('garbage-meter-fill');
    const playerLabelBar = document.getElementById('player-label-bar');

    // Opponent Section
    const opponentSection = document.getElementById('opponent-section');
    const oppScoreEl = document.getElementById('opp-score');
    const oppLinesEl = document.getElementById('opp-lines');

    // Lobby Modal Elements
    const lobbyModal = document.getElementById('lobby-modal');
    const btnCreateRoom = document.getElementById('btn-create-room');
    const inputRoomId = document.getElementById('input-room-id');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const btnCloseLobby = document.getElementById('btn-close-lobby');

    const lobbySetupView = document.getElementById('lobby-setup-view');
    const roomStatusArea = document.getElementById('room-status-area');
    const displayRoomId = document.getElementById('display-room-id');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const player1Status = document.getElementById('player1-status');
    const player2Status = document.getElementById('player2-status');
    const hostStartContainer = document.getElementById('host-start-container');
    const btnStartBattle = document.getElementById('btn-start-battle');
    const guestWaitingMsg = document.getElementById('guest-waiting-msg');
    const lobbyErrorMsg = document.getElementById('lobby-error-msg');

    // Action buttons
    const btnSound = document.getElementById('btn-sound');
    const soundIcon = document.getElementById('sound-icon');
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnRetry = document.getElementById('btn-retry');

    // Mobile control buttons
    const btnHold = document.getElementById('btn-hold');
    const btnRotate = document.getElementById('btn-rotate');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnDown = document.getElementById('btn-down');
    const btnDrop = document.getElementById('btn-drop');

    // Set pixel dimensions
    boardCanvas.width = COLS * BLOCK_SIZE;
    boardCanvas.height = ROWS * BLOCK_SIZE;

    nextCanvas.width = 4 * BLOCK_SIZE;
    nextCanvas.height = 4 * BLOCK_SIZE;

    if (holdCanvas) {
        holdCanvas.width = 4 * BLOCK_SIZE;
        holdCanvas.height = 4 * BLOCK_SIZE;
    }

    if (opponentCanvas) {
        opponentCanvas.width = 220;
        opponentCanvas.height = 440;
    }

    // Network manager instance
    const network = new NetworkManager();

    function updateUI(game) {
        if (scoreEl) scoreEl.innerText = game.score;
        if (highScoreEl) highScoreEl.innerText = game.highScore;
        if (levelEl) levelEl.innerText = game.level;
        if (linesEl) linesEl.innerText = game.lines;

        if (soundIcon) {
            soundIcon.innerText = game.audio.isMuted ? '🔇' : '🔊';
        }

        if (pauseOverlay) {
            if (game.isPaused && !game.isGameOver && !game.isBattleMode) {
                pauseOverlay.classList.remove('hidden');
            } else {
                pauseOverlay.classList.add('hidden');
            }
        }

        if (gameOverOverlay) {
            if (game.isGameOver && !game.isBattleMode) {
                if (finalScoreEl) finalScoreEl.innerText = game.score;
                if (finalHighScoreEl) finalHighScoreEl.innerText = game.highScore;
                gameOverOverlay.classList.remove('hidden');
            } else {
                gameOverOverlay.classList.add('hidden');
            }
        }
    }

    // Initialize Game
    const game = new Game(
        boardCanvas,
        nextCanvas,
        holdCanvas,
        (g) => updateUI(g),
        (g) => updateUI(g)
    );

    // Garbage Meter Callback
    game.onGarbageChange = (count) => {
        if (!garbageMeterFill) return;
        const percent = Math.min(100, (count / 20) * 100);
        garbageMeterFill.style.height = `${percent}%`;
    };

    updateUI(game);

    // Start Game from Instructions Modal or Enter key
    function startGame() {
        game.audio.ensureContext();
        if (instructionsModal) {
            instructionsModal.classList.add('hidden');
        }
        if (game.isPaused) {
            game.togglePause();
        }
        if (!game.isStarted) {
            game.audio.playStart();
            game.start();
        }
        updateUI(game);
    }

    // Keyboard controls
    const preventKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space']);

    window.addEventListener('keydown', (e) => {
        // Instructions modal is visible
        if (instructionsModal && !instructionsModal.classList.contains('hidden')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                startGame();
                return;
            }
            if (preventKeys.has(e.key)) {
                e.preventDefault();
            }
            return;
        }

        game.audio.ensureContext();

        if (preventKeys.has(e.key)) {
            e.preventDefault();
        }

        game.handleInput(e.key);
        updateUI(game);
    });

    // Touch and click mobile controls
    const bindControl = (btn, action) => {
        if (!btn) return;
        const trigger = (e) => {
            e.preventDefault();
            game.audio.ensureContext();
            action();
            updateUI(game);
        };
        btn.addEventListener('click', trigger);
        btn.addEventListener('touchstart', trigger, { passive: false });
    };

    bindControl(btnLeft, () => game.handleInput('ArrowLeft'));
    bindControl(btnRight, () => game.handleInput('ArrowRight'));
    bindControl(btnRotate, () => game.handleInput('ArrowUp'));
    bindControl(btnDown, () => game.handleInput('ArrowDown'));
    bindControl(btnDrop, () => game.handleInput(' '));
    bindControl(btnHold, () => game.hold());

    // Action button listeners
    if (btnSound) {
        btnSound.addEventListener('click', () => {
            game.audio.ensureContext();
            game.audio.toggleMute();
            updateUI(game);
        });
    }

    if (btnPause) {
        btnPause.addEventListener('click', () => {
            game.togglePause();
            updateUI(game);
        });
    }

    if (btnResume) {
        btnResume.addEventListener('click', () => {
            game.togglePause();
            updateUI(game);
        });
    }

    if (btnRetry) {
        btnRetry.addEventListener('click', () => {
            game.audio.ensureContext();
            game.reset();
            game.start();
            updateUI(game);
        });
    }

    if (btnStartGame) {
        btnStartGame.addEventListener('click', () => {
            startGame();
        });
    }

    if (btnHowToPlay) {
        btnHowToPlay.addEventListener('click', () => {
            if (instructionsModal) {
                if (game.isStarted && !game.isPaused && !game.isGameOver && !game.isBattleMode) {
                    game.togglePause();
                }
                instructionsModal.classList.remove('hidden');
                updateUI(game);
            }
        });
    }

    // ==========================================
    // Online Battle & Lobby Logic
    // ==========================================
    function setGameMode(mode) {
        if (mode === 'solo') {
            navSolo.classList.add('active');
            navBattle.classList.remove('active');
            opponentSection.classList.add('hidden');
            if (garbageMeter) garbageMeter.classList.add('hidden');
            if (playerLabelBar) playerLabelBar.classList.add('hidden');
            highScoreContainer.classList.remove('hidden');
            playerLabel.innerText = 'SOLO';

            lobbyModal.classList.add('hidden');
            battleResultOverlay.classList.add('hidden');

            if (game.isBattleMode) {
                network.leaveRoom();
                game.setBattleMode(null);
                game.reset();
                game.start();
            }
        } else {
            navSolo.classList.remove('active');
            navBattle.classList.add('active');
            highScoreContainer.classList.add('hidden');
            if (instructionsModal) instructionsModal.classList.add('hidden');

            openLobbyModal();
        }
    }

    navSolo.addEventListener('click', () => setGameMode('solo'));
    navBattle.addEventListener('click', () => setGameMode('battle'));

    function openLobbyModal() {
        lobbyModal.classList.remove('hidden');
        lobbyErrorMsg.classList.add('hidden');
        lobbyErrorMsg.innerText = '';

        if (!network.roomId) {
            lobbySetupView.classList.remove('hidden');
            roomStatusArea.classList.add('hidden');
        } else {
            lobbySetupView.classList.add('hidden');
            roomStatusArea.classList.remove('hidden');
        }

        network.connect().catch((err) => {
            showLobbyError('サーバーへの接続に失敗しました。サーバーが起動しているか確認してください。');
        });
    }

    function showLobbyError(msg) {
        lobbyErrorMsg.innerText = msg;
        lobbyErrorMsg.classList.remove('hidden');
    }

    btnCloseLobby.addEventListener('click', () => {
        if (network.roomId) {
            network.leaveRoom();
        }
        setGameMode('solo');
    });

    btnCreateRoom.addEventListener('click', () => {
        game.audio.ensureContext();
        network.connect().then(() => {
            network.createRoom();
        });
    });

    btnJoinRoom.addEventListener('click', () => {
        game.audio.ensureContext();
        const code = (inputRoomId.value || '').trim();
        if (!code) {
            showLobbyError('ルームコードを入力してください。');
            return;
        }
        network.connect().then(() => {
            network.joinRoom(code);
        });
    });

    btnCopyLink.addEventListener('click', () => {
        if (!network.roomId) return;
        const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${network.roomId}`;
        navigator.clipboard.writeText(inviteUrl).then(() => {
            btnCopyLink.innerText = '✅ COPIED!';
            setTimeout(() => {
                btnCopyLink.innerText = '📋 COPY LINK';
            }, 2000);
        }).catch(() => {
            prompt('以下の招待URLをコピーしてください:', inviteUrl);
        });
    });

    btnStartBattle.addEventListener('click', () => {
        game.audio.ensureContext();
        network.startBattle();
    });

    // Network Callbacks
    network.on('room_created', ({ roomId, role }) => {
        displayRoomId.innerText = roomId;
        player1Status.innerText = 'HOST: あなた (READY)';
        player2Status.innerText = 'CHALLENGER: 待機中...';
        hostStartContainer.classList.add('hidden');
        guestWaitingMsg.classList.add('hidden');

        lobbySetupView.classList.add('hidden');
        roomStatusArea.classList.remove('hidden');
    });

    network.on('room_joined', ({ roomId, role }) => {
        displayRoomId.innerText = roomId;
        player1Status.innerText = 'HOST: 接続中';
        player2Status.innerText = 'CHALLENGER: あなた (READY)';
        hostStartContainer.classList.add('hidden');
        guestWaitingMsg.classList.remove('hidden');

        lobbySetupView.classList.add('hidden');
        roomStatusArea.classList.remove('hidden');
    });

    network.on('opponent_joined', ({ role }) => {
        player2Status.innerText = 'CHALLENGER: 参加完了！';
        player2Status.style.color = '#00ff66';
        if (network.role === 'host') {
            hostStartContainer.classList.remove('hidden');
        }
    });

    network.on('battle_countdown', ({ seed, count }) => {
        lobbyModal.classList.add('hidden');
        battleResultOverlay.classList.add('hidden');
        opponentSection.classList.remove('hidden');
        if (garbageMeter) garbageMeter.classList.remove('hidden');
        if (playerLabelBar) playerLabelBar.classList.remove('hidden');

        playerLabel.innerText = network.role === 'host' ? 'YOU (HOST)' : 'YOU (CHALLENGER)';

        // Switch game to Battle Mode with shared seed
        game.setBattleMode(network, seed);

        // Run countdown
        countdownOverlay.classList.remove('hidden');
        let currentCount = count || 3;
        countdownText.innerText = currentCount;
        game.audio.playCountdown(currentCount);

        const timer = setInterval(() => {
            currentCount--;
            if (currentCount > 0) {
                countdownText.innerText = currentCount;
                game.audio.playCountdown(currentCount);
            } else if (currentCount === 0) {
                countdownText.innerText = 'FIGHT!';
                countdownText.style.color = '#ff0055';
                game.audio.playCountdown(0);
            } else {
                clearInterval(timer);
                countdownOverlay.classList.add('hidden');
                countdownText.style.color = '#00f0ff';
                game.start();
            }
        }, 900);
    });

    network.on('opponent_state', (state) => {
        if (opponentCanvas) {
            game.renderer.drawOpponent(opponentCanvas, state);
        }
        if (oppScoreEl && state.score !== undefined) {
            oppScoreEl.innerText = state.score;
        }
        if (oppLinesEl && state.lines !== undefined) {
            oppLinesEl.innerText = state.lines;
        }
    });

    network.on('incoming_garbage', ({ lines, holeCol }) => {
        game.receiveGarbage(lines, holeCol);
    });

    network.on('battle_result', ({ result, winner }) => {
        game.isGameOver = true;
        battleResultOverlay.classList.remove('hidden');

        if (result === 'win') {
            game.audio.playVictory();
            battleResultTitle.innerText = 'VICTORY! 🏆';
            battleResultTitle.className = 'overlay-title neon-yellow';
            battleResultSub.innerText = 'KNOCKOUT! 相手の盤面が埋まりました！';
        } else {
            game.audio.playDefeat();
            battleResultTitle.innerText = 'DEFEATED... 💀';
            battleResultTitle.className = 'overlay-title neon-pink';
            battleResultSub.innerText = 'YOU TOPPED OUT!';
        }
    });

    network.on('opponent_left', () => {
        if (game.isBattleMode && !game.isGameOver) {
            game.isGameOver = true;
            battleResultOverlay.classList.remove('hidden');
            battleResultTitle.innerText = 'VICTORY! 🏆';
            battleResultTitle.className = 'overlay-title neon-yellow';
            battleResultSub.innerText = '対戦相手が切断しました。あなたの不戦勝です！';
        } else if (network.roomId) {
            player2Status.innerText = 'CHALLENGER: 待機中...';
            player2Status.style.color = '';
            hostStartContainer.classList.add('hidden');
        }
    });

    network.on('rematch_offered', () => {
        btnRematch.innerText = 'ACCEPT REMATCH!';
        btnRematch.classList.add('neon-btn');
    });

    network.on('error', (msg) => {
        showLobbyError(msg);
    });

    btnRematch.addEventListener('click', () => {
        game.audio.ensureContext();
        if (network.role === 'host') {
            network.sendRematchAccept();
        } else {
            network.sendRematchRequest();
            btnRematch.innerText = 'WAITING FOR HOST...';
        }
    });

    btnLeaveBattle.addEventListener('click', () => {
        setGameMode('solo');
    });

    // URL Query Parameter Auto-Join (e.g. ?room=ABCD)
    const urlParams = new URLSearchParams(window.location.search);
    const roomQuery = urlParams.get('room');
    if (roomQuery) {
        if (instructionsModal) instructionsModal.classList.add('hidden');
        setGameMode('battle');
        inputRoomId.value = roomQuery.toUpperCase();
        network.connect().then(() => {
            network.joinRoom(roomQuery.toUpperCase());
        });
    } else {
        // Start default solo mode: run rendering loop, waiting for Enter to start
        game.startLoop();
    }
});
