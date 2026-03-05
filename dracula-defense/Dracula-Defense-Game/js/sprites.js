const SpriteRenderer = {
    palettes: {
        '0': 'transparent',
        '1': '#000000', // black
        '2': '#ffffff', // white
        '3': '#cc0000', // blood red
        '4': '#ffd700', // gold
        '5': '#8888aa', // minion armor
        '6': '#33cc55', // priest robe
        '7': '#ffccaa', // skin tone
        '8': '#aaddff', // icy blue
        '9': '#ff5555', // whip tip
        'A': '#aaaaaa', // knight armor
        'B': '#ddaa00', // gold shield
        'C': '#663300', // brown wood
        'D': '#4444ff', // holy magic
    },
    sprites: {
        dracula: [
            "00001110000",
            "00017771000",
            "00013731000",
            "00017771000",
            "00111111100",
            "01311111310",
            "01311111310",
            "01311111310",
            "00110001100",
            "00110001100",
            "00000000000"
        ],
        minion: [
            "00001110000",
            "00015551000",
            "00155155100",
            "00015551000",
            "00111111100",
            "01515551510",
            "0151A5A1510",
            "0151A5A1510",
            "00110001100",
            "00110001100",
            "00000000000"
        ],
        knight: [
            "00011111000",
            "001AAAAA100",
            "01A2A1A2A10",
            "001AAAAA100",
            "01111111110",
            "1AA1AAAA1AA1",
            "1AA1A11A1AA1",
            "1AA1AAAA1AA1",
            "001AA00AA10",
            "001AA00AA10",
            "00111001110"
        ],
        priest: [
            "00001110000",
            "00017771000",
            "00017171000",
            "00017771000",
            "00111111100",
            "01616661610",
            "0161646161C",
            "0161666161C",
            "0011666110C",
            "0011666110C",
            "0001111100C"
        ],
        core: [
            "00000300000",
            "00003330000",
            "00032323000",
            "00323332300",
            "00333333300",
            "03233133230",
            "00333333300",
            "00323332300",
            "00032323000",
            "00003330000",
            "00000300000"
        ],
        whip: [
            "00000000000",
            "00000000990",
            "00000009009",
            "00000090000",
            "00000900000",
            "00009000000",
            "00090000000",
            "000C0000000",
            "000C0000000",
            "000C0000000",
            "00000000000"
        ],
        claws: [
            "00000000000",
            "00000000000",
            "00200200200",
            "00200200200",
            "00120120120",
            "00012012012",
            "00001001001",
            "00000000000",
            "00000000000",
            "00000000000",
            "00000000000"
        ],
        sword: [
            "00000000008",
            "00000000082",
            "00000000828",
            "00000008280",
            "00000082800",
            "00000828000",
            "00008280000",
            "000A8A00000",
            "0000C000000",
            "000C0000000",
            "00C00000000"
        ],
        shield: [
            "00000000000",
            "0000B0B0000",
            "000BBBBB000",
            "0000B0B0000",
            "0000B0B0000",
            "0000B0B0000",
            "00000B00000",
            "00000000000",
            "00000000000",
            "00000000000",
            "00000000000"
        ]
    },
    cache: {},
    scale: 4,

    init() {
        for (let key in this.sprites) {
            const data = this.sprites[key];
            const canvas = document.createElement('canvas');
            canvas.width = data[0].length * this.scale;
            canvas.height = data.length * this.scale;
            const ctx = canvas.getContext('2d');

            for (let y = 0; y < data.length; y++) {
                for (let x = 0; x < data[y].length; x++) {
                    const colorCode = data[y][x];
                    if (colorCode !== '0') {
                        ctx.fillStyle = this.palettes[colorCode];
                        ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
                    }
                }
            }
            this.cache[key] = canvas;
        }
    },

    draw(ctx, key, x, y, angle = 0, opacity = 1.0, scaleX = 1.0, scaleY = 1.0) {
        if (!this.cache[key]) return;
        const img = this.cache[key];
        ctx.save();
        ctx.translate(x, y);
        if (angle !== 0) ctx.rotate(angle);
        if (scaleX !== 1.0 || scaleY !== 1.0) ctx.scale(scaleX, scaleY);
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
    }
};
