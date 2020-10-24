// /* Base structure and authentic idea PSeudo (Credits: Dennis Koluris) */

#define COLOR_MAX \
    255

#define COLOR_HALF \
    COLOR_MAX >>> 1

/***
    Base components
***/

#define RGBC(data) { \
    a: (data >>>  0) & 0xff, \
    b: (data >>>  8) & 0xff, \
    c: (data >>> 16) & 0xff, \
    n: (data >>> 24) & 0xff, \
}

#define POINT(data) { \
    h: (data >>  0) & 0xffff, \
    v: (data >> 16) & 0xffff, \
}

#define UV(data) { \
    u: (data >>> 0) & 0xff, \
    v: (data >>> 8) & 0xff, \
}

#define TPAGE(data) \
    (data >>> 16) & 0xffff

/***
    Primitive Structures
***/

#define PFx(data) { \
    cr: [ \
        RGBC(data[0]) \
    ], \
    vx: [ \
        POINT(data[1]), \
        POINT(data[2]), \
        POINT(data[3]), \
        POINT(data[4]), \
    ] \
}

#define PGx(data) { \
    cr: [ \
        RGBC(data[0]), \
        RGBC(data[2]), \
        RGBC(data[4]), \
        RGBC(data[6]), \
    ], \
    vx: [ \
        POINT(data[1]), \
        POINT(data[3]), \
        POINT(data[5]), \
        POINT(data[7]), \
    ] \
}

#define PFTx(data) { \
    cr: [ \
        RGBC(data[0]) \
    ], \
    vx: [ \
        POINT(data[1]), \
        POINT(data[3]), \
        POINT(data[5]), \
        POINT(data[7]), \
    ], \
    tx: [ \
        UV(data[2]), \
        UV(data[4]), \
        UV(data[6]), \
        UV(data[8]), \
    ], \
    tp: [ \
        TPAGE(data[2]), \
        TPAGE(data[4]), \
    ] \
}

#define PGTx(data) { \
    cr: [ \
        RGBC(data[0]), \
        RGBC(data[3]), \
        RGBC(data[6]), \
        RGBC(data[9]), \
    ], \
    vx: [ \
        POINT(data[ 1]), \
        POINT(data[ 4]), \
        POINT(data[ 7]), \
        POINT(data[10]), \
    ], \
    tx: [ \
        UV(data[ 2]), \
        UV(data[ 5]), \
        UV(data[ 8]), \
        UV(data[11]), \
    ], \
    tp: [ \
        TPAGE(data[2]), \
        TPAGE(data[5]), \
    ] \
}

#define TILEx(data) { \
    cr: [ \
        RGBC(data[0]) \
    ], \
    vx: [ \
        POINT(data[1]), \
        POINT(data[2]), \
    ] \
}

#define SPRTx(data) { \
    cr: [ \
        RGBC(data[0]) \
    ], \
    vx: [ \
        POINT(data[1]), \
        POINT(data[3]), \
    ], \
    tx: [ \
        UV(data[2]) \
    ], \
    tp: [ \
        TPAGE(data[2]) \
    ] \
}

pseudo.CstrRender = (function() {
    var ctx, attrib, bfr, divRes; // WebGL Context
    var blend, bit, ofs;
    var drawArea, spriteTP;

    // Resolution
    const res = {
        w: 0,
        h: 0,
    };

    // Generic function for shaders
    function createShader(kind, content) {
        const shader = ctx.createShader(kind);
        ctx.shaderSource (shader, content);
        ctx.compileShader(shader);
        ctx.fetchShaderParameter(shader, ctx.COMPILE_STATUS);

        return shader;
    }

    function drawAreaCalc(n) {
        return Math.round((n * res.w) / 100);
    }

    // Compose Blend
    function composeBlend(a) {
        const b = [
            a & 2 ? blend : 0,
            a & 2 ? bit[blend].opaque : COLOR_MAX
        ];

        ctx.blendFunc(bit[b[0]].src, bit[b[0]].dest);
        return b[1];
    }

    /***
        Vertices
    ***/

    function drawF(data, size, mode) {
        const p = PFx(data);
        var color  = [];
        var vertex = [];
        
        const opaque = composeBlend(p.cr[0].n);
        
        for (var i = 0; i < size; i++) {
            color.push(
                p.cr[0].a,
                p.cr[0].b,
                p.cr[0].c,
                opaque
            );

            vertex.push(
                p.vx[i].h + ofs.h,
                p.vx[i].v + ofs.v
            );
        }

        drawScene(color, vertex, null, mode, size);
    }

    /***
        Gouraud Vertices
    ***/

    function drawG(data, size, mode) { \
        const p = PGx(data);
        var color  = [];
        var vertex = [];
        
        const opaque = composeBlend(p.cr[0].n);
        
        for (var i = 0; i < size; i++) {
            color.push(
                p.cr[i].a,
                p.cr[i].b,
                p.cr[i].c,
                opaque
            );

            vertex.push(
                p.vx[i].h + ofs.h,
                p.vx[i].v + ofs.v
            );
        }

        drawScene(color, vertex, null, mode, size);
    }

    /***
        Textured Vertices
    ***/

    function drawFT(data, size) {
        const p = PFTx(data);
        var color   = [];
        var vertex  = [];
        var texture = [];
        
        blend = (p.tp[1] >>> 5) & 3;
        const opaque = composeBlend(p.cr[0].n);
        
        for (var i = 0; i < size; i++) {
            if (p.cr.n & 1) {
                color.push(
                    COLOR_HALF,
                    COLOR_HALF,
                    COLOR_HALF,
                    opaque
                );
            }
            else {
                color.push(
                    p.cr[0].a,
                    p.cr[0].b,
                    p.cr[0].c,
                    opaque
                );
            }

            vertex.push(
                p.vx[i].h + ofs.h,
                p.vx[i].v + ofs.v
            );

            texture.push(
                p.tx[i].u,
                p.tx[i].v
            );
        }

        tcache.fetchTexture(ctx, p.tp[1], p.tp[0]);
        drawScene(color, vertex, texture, ctx.TRIANGLE_STRIP, size);
    }

    /***
        Gouraud/Textured Vertices
    ***/

    function drawGT(data, size) {
        const p = PGTx(data);
        var color   = [];
        var vertex  = [];
        var texture = [];
        
        blend = (p.tp[1] >>> 5) & 3;
        const opaque = composeBlend(p.cr[0].n);
        
        for (var i = 0; i < size; i++) {
            color.push(
                p.cr[i].a,
                p.cr[i].b,
                p.cr[i].c,
                opaque
            );

            vertex.push(
                p.vx[i].h + ofs.h,
                p.vx[i].v + ofs.v
            );

            texture.push(
                p.tx[i].u,
                p.tx[i].v
            );
        }

        tcache.fetchTexture(ctx, p.tp[1], p.tp[0]);
        drawScene(color, vertex, texture, ctx.TRIANGLE_STRIP, size);
    }

    /***
        Tiles
    ***/

    function drawTile(data, size) {
        const p = TILEx(data);
        var color  = [];
        var vertex = [];
        
        const opaque = composeBlend(p.cr[0].n);
        
        if (size) {
            p.vx[1].h = size;
            p.vx[1].v = size;
        }

        for (var i = 0; i < 4; i++) {
            color.push(
                p.cr[0].a,
                p.cr[0].b,
                p.cr[0].c,
                opaque
            );
        }

        vertex = [
            p.vx[0].h + ofs.h,             p.vx[0].v + ofs.v,
            p.vx[0].h + ofs.h + p.vx[1].h, p.vx[0].v + ofs.v,
            p.vx[0].h + ofs.h,             p.vx[0].v + ofs.v + p.vx[1].v,
            p.vx[0].h + ofs.h + p.vx[1].h, p.vx[0].v + ofs.v + p.vx[1].v,
        ];

        drawScene(color, vertex, null, ctx.TRIANGLE_STRIP, 4);
    }

    /***
        Sprites
    ***/

    function drawSprite(data, size) {
        const p = SPRTx(data);
        var color   = [];
        var vertex  = [];
        var texture = [];
        
        const opaque = composeBlend(p.cr[0].n);
        
        if (size) {
            p.vx[1].h = size;
            p.vx[1].v = size;
        }

        for (var i = 0; i < 4; i++) {
            if (p.cr[0].n & 1) {
                color.push(
                    COLOR_HALF,
                    COLOR_HALF,
                    COLOR_HALF,
                    opaque
                );
            }
            else {
                color.push(
                    p.cr[0].a,
                    p.cr[0].b,
                    p.cr[0].c,
                    opaque
                );
            }
        }

        vertex = [
            p.vx[0].h + ofs.h,             p.vx[0].v + ofs.v,
            p.vx[0].h + ofs.h + p.vx[1].h, p.vx[0].v + ofs.v,
            p.vx[0].h + ofs.h,             p.vx[0].v + ofs.v + p.vx[1].v,
            p.vx[0].h + ofs.h + p.vx[1].h, p.vx[0].v + ofs.v + p.vx[1].v,
        ];

        texture = [
            p.tx[0].u,             p.tx[0].v,
            p.tx[0].u + p.vx[1].h, p.tx[0].v,
            p.tx[0].u,             p.tx[0].v + p.vx[1].v,
            p.tx[0].u + p.vx[1].h, p.tx[0].v + p.vx[1].v,
        ];

        tcache.fetchTexture(ctx, spriteTP, p.tp[0]);
        drawScene(color, vertex, texture, ctx.TRIANGLE_STRIP, 4);
    }

    function drawScene(color, vertex, texture, mode, size) {
        // Compose Color
        ctx.bindBuffer(ctx.ARRAY_BUFFER, bfr._c);
        ctx.vertexAttribPointer(attrib._c, 4, ctx.UNSIGNED_BYTE, true, 0, 0);
        ctx.bufferData(ctx.ARRAY_BUFFER, new UintBcap(color), ctx.STATIC_DRAW);

        // Compose Vertex
        ctx.bindBuffer(ctx.ARRAY_BUFFER, bfr._v);
        ctx.vertexAttribPointer(attrib._p, 2, ctx.SHORT, false, 0, 0);
        ctx.bufferData(ctx.ARRAY_BUFFER, new SintHcap(vertex), ctx.STATIC_DRAW);
        
        if (texture) {
            // Compose Texture
            for (const i in texture) {
                texture[i] /= 256.0;
            }

            ctx.uniform1i(attrib._e, true);
            ctx.enableVertexAttrib(attrib._t);
            ctx.bindBuffer(ctx.ARRAY_BUFFER, bfr._t);
            ctx.vertexAttribPointer(attrib._t, 2, ctx.FLOAT, false, 0, 0);
            ctx.bufferData(ctx.ARRAY_BUFFER, new F32cap(texture), ctx.STATIC_DRAW);
        }
        else {
            // Disable Texture
            ctx.uniform1i(attrib._e, false);
            ctx.disableVertexAttrib(attrib._t);
        }

        // Draw!
        //ctx.enable(ctx.SCISSOR_TEST);
        //ctx.scissor(drawArea.start.h, drawArea.start.v, drawArea.end.h, drawArea.end.v);
        ctx.drawVertices(mode, 0, size);
        //ctx.disable(ctx.SCISSOR_TEST);
    }

    // Exposed class functions/variables
    return {
        awake(canvas, resolution) {
            divRes = resolution[0];

            // WebGL Canvas
            ctx = canvas[0].fetchContext(WebGL);
            ctx.enable(ctx.BLEND);
            ctx.clearColor(0.0, 0.0, 0.0, 1.0);

            // Shaders
            const func = ctx.createFunction();
            ctx.attachShader(func, createShader(ctx.  VERTEX_SHADER, SHADER_VERTEX));
            ctx.attachShader(func, createShader(ctx.FRAGMENT_SHADER, SHADER_FRAGMENT));
            ctx.linkFunction(func);
            ctx.fetchFunctionParameter(func, ctx.LINK_STATUS);
            ctx.useFunction (func);

            // Attributes
            attrib = {
                _c: ctx.fetchAttribute(func, 'a_color'),
                _p: ctx.fetchAttribute(func, 'a_position'),
                _t: ctx.fetchAttribute(func, 'a_texCoord'),
                _r: ctx.fetchUniform  (func, 'u_resolution'),
                _e: ctx.fetchUniform  (func, 'u_enabled')
            };

            ctx.enableVertexAttrib(attrib._c);
            ctx.enableVertexAttrib(attrib._p);
            ctx.enableVertexAttrib(attrib._t);

            // Buffers
            bfr = {
                _c: ctx.createBuffer(),
                _v: ctx.createBuffer(),
                _t: ctx.createBuffer(),
            };

            // Blend
            bit = [
                { src: ctx.SRC_ALPHA, dest: ctx.ONE_MINUS_SRC_ALPHA, opaque: 128 },
                { src: ctx.ONE,       dest: ctx.ONE_MINUS_SRC_ALPHA, opaque:   0 },
                { src: ctx.ZERO,      dest: ctx.ONE_MINUS_SRC_COLOR, opaque:   0 },
                { src: ctx.SRC_ALPHA, dest: ctx.ONE,                 opaque:  64 },
            ];

            // Texture Cache
            tcache.init();
        },

        reset() {
            spriteTP = 0;
               blend = 0;

            // Draw Area Start/End
            drawArea = {
                start: { h: 0, v: 0 },
                  end: { h: 0, v: 0 },
            };

            // Offset
            ofs = {
                h: 0, v: 0
            };

            // Texture Cache
            tcache.reset(ctx);
            render.resize({ w: 640, h: 480 });
        },

        resize(data) {
            // Same resolution? Ciao!
            if (data.w === res.w && data.h === res.h) {
                return;
            }
    
            // Check if we have a valid resolution
            if (data.w > 0 && data.h > 0) {
                // Store valid resolution
                res.w = data.w;
                res.h = data.h;
              
                ctx.uniform2f(attrib._r, res.w / 2, res.h / 2);
                ctx.viewport((640 - res.w) / 2, (480 - res.h) / 2, res.w, res.h);
                ctx.clear(ctx.COLOR_BUFFER_BIT);
    
                divRes.innerText = res.w + ' x ' + res.h;
            }
        },

        draw(addr, data) {
            // Primitives
            switch(addr & 0xfc) {
                case 0x20: // POLY F3
                    drawF(data, 3, ctx.TRIANGLE_STRIP);
                    return;

                case 0x24: // POLY FT3
                    drawFT(data, 3);
                    return;

                case 0x28: // POLY F4
                    drawF(data, 4, ctx.TRIANGLE_STRIP);
                    return;

                case 0x2c: // POLY FT4
                    drawFT(data, 4);
                    return;

                case 0x30: // POLY G3
                    drawG(data, 3, ctx.TRIANGLE_STRIP);
                    return;

                case 0x34: // POLY GT3
                    drawGT(data, 3);
                    return;

                case 0x38: // POLY G4
                    drawG(data, 4, ctx.TRIANGLE_STRIP);
                    return;

                case 0x3c: // POLY GT4
                    drawGT(data, 4);
                    return;

                case 0x40: // LINE F2
                    drawF(data, 2, ctx.LINE_STRIP);
                    return;

                case 0x48: // LINE F3
                    drawF(data, 3, ctx.LINE_STRIP);
                    return;

                case 0x4c: // LINE F4
                    drawF(data, 4, ctx.LINE_STRIP);
                    return;

                case 0x50: // LINE G2
                    drawG(data, 2, ctx.LINE_STRIP);
                    return;

                case 0x58: // LINE G3
                    drawG(data, 3, ctx.LINE_STRIP);
                    return;

                case 0x5c: // LINE G4
                    drawG(data, 4, ctx.LINE_STRIP);
                    return;

                case 0x60: // TILE S
                    drawTile(data, 0);
                    return;

                case 0x64: // SPRITE S
                    drawSprite(data, 0);
                    return;

                case 0x68: // TILE 1
                    drawTile(data, 1);
                    return;

                case 0x70: // TILE 8
                    drawTile(data, 8);
                    return;

                case 0x74: // SPRITE 8
                    drawSprite(data, 8);
                    return;

                case 0x78: // TILE 16
                    drawTile(data, 16);
                    return;

                case 0x7c: // SPRITE 16
                    drawSprite(data, 16);
                    return;
            }

            // Operations
            switch(addr) {
                case 0x01: // FLUSH
                    return;

                case 0x02: // BLOCK FILL
                    {
                        const p = TILEx(data);
                        var color  = [];
                        var vertex = [];

                        for (var i = 0; i < 4; i++) {
                            color.push(
                                p.cr[0].a,
                                p.cr[0].b,
                                p.cr[0].c,
                                COLOR_MAX
                            );
                        }

                        vertex = [
                            p.vx[0].h,             p.vx[0].v,
                            p.vx[0].h + p.vx[1].h, p.vx[0].v,
                            p.vx[0].h,             p.vx[0].v + p.vx[1].v,
                            p.vx[0].h + p.vx[1].h, p.vx[0].v + p.vx[1].v,
                        ];
                        
                        drawScene(color, vertex, null, ctx.TRIANGLE_STRIP, 4);
                    }
                    return;

                case 0x80: // MOVE IMAGE
                    return;

                case 0xa0: // LOAD IMAGE
                    vs.photoRead(data);
                    return;

                case 0xc0: // STORE IMAGE
                    vs.photoWrite(data);
                    return;

                case 0xe1: // TEXTURE PAGE
                    blend = (data[0] >>> 5) & 3;
                    spriteTP = data[0] & 0x7ff;
                    ctx.blendFunc(bit[blend].src, bit[blend].dest);
                    return;

                case 0xe2: // TEXTURE WINDOW
                    return;

                case 0xe3: // DRAW AREA START
                    {
                        const pane = {
                            h: data[0] & 0x3ff, v: (data[0] >> 10) & 0x1ff
                        };

                        drawArea.start.h = drawAreaCalc(pane.h);
                        drawArea.start.v = drawAreaCalc(pane.v);
                    }
                    return;

                case 0xe4: // DRAW AREA END
                    {
                        const pane = {
                            h: data[0] & 0x3ff, v: (data[0] >> 10) & 0x1ff
                        };

                        drawArea.end.h = drawAreaCalc(pane.h);
                        drawArea.end.v = drawAreaCalc(pane.v);
                    }
                    return;

                case 0xe5: // DRAW OFFSET
                    ofs.h = (SIGN_EXT_32(data[0]) << 21) >> 21;
                    ofs.v = (SIGN_EXT_32(data[0]) << 10) >> 21;
                    return;

                case 0xe6: // STP
                    return;
            }

            psx.error('GPU Render Primitive ' + psx.hex(addr));
        },

        outputVRAM(raw, iX, iY, iW, iH) {
        }
    };
})();
