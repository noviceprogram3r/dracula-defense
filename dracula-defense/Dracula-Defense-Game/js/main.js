// Main Application Orchestrator

window.GameApp = {
    engine: null,
    canvas: null,
    ctx: null,
    state: 'START', // START, PLAYING, GAMEOVER, VICTORY
    audio: null,

    // Stats
    score: 0,
    wave: 1,
    maxWaves: 5,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Resize handler
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();

        if (typeof SpriteRenderer !== 'undefined') SpriteRenderer.init();

        // Setup UI listeners
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('vic-restart-btn').addEventListener('click', () => this.startGame());

        // Check device type
        if ('ontouchstart' in window) {
            document.getElementById('mobile-controls').classList.remove('hidden');
        }

        // We initialize Audio class but don't play until interaction
        if (typeof AudioEngine !== 'undefined') {
            this.audio = new AudioEngine();
        }
    },

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        if (screenId) {
            document.getElementById(screenId).classList.remove('hidden');
        }
    },

    updateHUD() {
        document.getElementById('hud-score').innerText = this.score;
        document.getElementById('hud-wave').innerText = this.wave;

        document.getElementById('go-score').innerText = this.score;
        document.getElementById('go-wave').innerText = this.wave;
        document.getElementById('vic-score').innerText = this.score;
    },

    startGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.wave = 1;
        this.showScreen(null); // Hide all screens
        document.getElementById('hud').classList.remove('hidden');
        this.updateHUD();

        // Resume AudioContext just in case
        if (this.audio) this.audio.init();

        // Initialize Game Engine
        this.engine = new GameEngine(this.canvas, this.ctx);
        if (this.audio) this.engine.audio = this.audio;

        // Setup bounds: Place core in middle.
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // these files will be created next
        if (typeof Player !== 'undefined') this.engine.player = new Player(cx, cy + 100);
        if (typeof CastleCore !== 'undefined') this.engine.core = new CastleCore(cx, cy);
        if (typeof WaveManager !== 'undefined') this.engine.waveManager = new WaveManager();

        this.engine.start();
    },

    addScore(points) {
        this.score += points;
        this.updateHUD();
    },

    setWave(waveNum) {
        this.wave = waveNum;
        if (this.wave > this.maxWaves) {
            this.triggerVictory();
        } else {
            this.updateHUD();
        }
    },

    triggerGameOver() {
        if (this.state !== 'PLAYING') return;
        this.state = 'GAMEOVER';
        this.engine.stop();
        document.getElementById('hud').classList.add('hidden');
        this.showScreen('game-over-screen');
    },

    triggerVictory() {
        if (this.state !== 'PLAYING') return;
        this.state = 'VICTORY';
        this.engine.stop();
        document.getElementById('hud').classList.add('hidden');
        this.showScreen('victory-screen');
    }
};

window.onload = () => {
    window.GameApp.init();
};
