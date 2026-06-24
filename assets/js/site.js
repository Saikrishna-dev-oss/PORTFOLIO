(function () {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initCursorAmbientBackground() {
        if (prefersReducedMotion) {
            return;
        }

        const existingLayer = document.querySelector('.cursor-ambient-layer');
        const layer = existingLayer || document.createElement('div');

        if (!existingLayer) {
            layer.className = 'cursor-ambient-layer';
            const canvas = document.createElement('canvas');
            canvas.setAttribute('aria-hidden', 'true');
            layer.appendChild(canvas);
            document.body.prepend(layer);
        }

        const canvas = layer.querySelector('canvas');
        const context = canvas.getContext('2d', { alpha: true });
        const pointer = {
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.35,
            targetX: window.innerWidth * 0.5,
            targetY: window.innerHeight * 0.35,
            velocityX: 0,
            velocityY: 0,
            active: false,
        };
        const palette = ['#f9a8d4', '#c4b5fd', '#93c5fd', '#99f6e4', '#fde68a', '#fecaca'];
        const orbits = [
            { radius: 220, speed: 0.00022, offset: 0.2, hue: 0 },
            { radius: 320, speed: -0.00018, offset: 1.8, hue: 1 },
            { radius: 260, speed: 0.00016, offset: 3.4, hue: 2 },
            { radius: 360, speed: -0.00012, offset: 4.8, hue: 3 },
            { radius: 180, speed: 0.00028, offset: 5.6, hue: 4 },
        ];

        let animationFrame = 0;
        let lastPointerTime = performance.now();
        let width = 0;
        let height = 0;
        const maxPixelRatio = 2;

        function resizeCanvas() {
            const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * pixelRatio);
            canvas.height = Math.round(height * pixelRatio);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        }

        function drawGlow(x, y, radius, colorStops, alphaMultiplier) {
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            for (let index = 0; index < colorStops.length; index += 1) {
                const stop = colorStops[index];
                gradient.addColorStop(stop.offset, stop.color.replace('{alpha}', String(stop.alpha * alphaMultiplier)));
            }
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }

        function drawBlob(x, y, radius, color, alpha) {
            context.fillStyle = color;
            context.globalAlpha = alpha;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
            context.globalAlpha = 1;
        }

        function drawRibbon(cx, cy, time, alphaMultiplier) {
            context.save();
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.globalCompositeOperation = 'screen';

            const points = [];
            const baseRadius = 180 + Math.sin(time * 0.0004) * 28;
            for (let index = 0; index < 12; index += 1) {
                const angle = (index / 12) * Math.PI * 2 + time * 0.00014;
                const wobble = Math.sin(angle * 3 + time * 0.0006) * 26 + Math.cos(angle * 2 - time * 0.0005) * 18;
                points.push({
                    x: cx + Math.cos(angle) * (baseRadius + wobble),
                    y: cy + Math.sin(angle) * (baseRadius * 0.72 + wobble * 0.5),
                });
            }

            for (let index = 0; index < points.length - 1; index += 1) {
                const start = points[index];
                const end = points[index + 1];
                context.strokeStyle = palette[index % palette.length];
                context.globalAlpha = 0.08 * alphaMultiplier;
                context.lineWidth = 120 - index * 4;
                context.beginPath();
                context.moveTo(start.x, start.y);
                context.quadraticCurveTo((start.x + end.x) * 0.5, (start.y + end.y) * 0.5, end.x, end.y);
                context.stroke();
            }

            context.restore();
        }

        function drawFrame(now) {
            context.clearRect(0, 0, width, height);
            context.fillStyle = 'rgba(251, 251, 253, 0.72)';
            context.fillRect(0, 0, width, height);

            const fade = Math.max(0.28, 1 - Math.min(1, (now - lastPointerTime) / 1400));
            const swirlX = pointer.x + Math.sin(now * 0.00025) * 35 + pointer.velocityX * 0.8;
            const swirlY = pointer.y + Math.cos(now * 0.00022) * 28 + pointer.velocityY * 0.8;

            context.save();
            context.filter = 'blur(28px)';
            context.globalCompositeOperation = 'screen';

            drawRibbon(swirlX, swirlY, now, 0.7 * fade);

            orbits.forEach((orbit, index) => {
                const t = now * orbit.speed + orbit.offset;
                const rx = width * 0.5 + Math.cos(t) * (width * 0.18 + orbit.radius * 0.08) + Math.sin(t * 1.7) * 40;
                const ry = height * 0.34 + Math.sin(t * 1.2) * (height * 0.12 + orbit.radius * 0.05) + Math.cos(t * 1.4) * 26;
                const cursorMix = 0.55 + fade * 0.45;
                drawBlob(
                    rx + (swirlX - width * 0.5) * 0.06 * cursorMix,
                    ry + (swirlY - height * 0.5) * 0.06 * cursorMix,
                    orbit.radius,
                    palette[orbit.hue],
                    0.14 + index * 0.01
                );
            });

            if (fade > 0.02) {
                drawGlow(
                    swirlX,
                    swirlY,
                    320,
                    [
                        { offset: 0, color: 'rgba(255, 255, 255, {alpha})', alpha: 0.42 },
                        { offset: 0.22, color: 'rgba(224, 231, 255, {alpha})', alpha: 0.48 },
                        { offset: 0.5, color: 'rgba(252, 231, 243, {alpha})', alpha: 0.34 },
                        { offset: 0.72, color: 'rgba(186, 230, 253, {alpha})', alpha: 0.26 },
                        { offset: 1, color: 'rgba(255, 255, 255, 0)', alpha: 1 },
                    ],
                    fade
                );

                drawGlow(
                    swirlX - pointer.velocityX * 6,
                    swirlY - pointer.velocityY * 6,
                    240,
                    [
                        { offset: 0, color: 'rgba(253, 224, 71, {alpha})', alpha: 0.18 },
                        { offset: 0.45, color: 'rgba(244, 114, 182, {alpha})', alpha: 0.2 },
                        { offset: 0.75, color: 'rgba(167, 243, 208, {alpha})', alpha: 0.16 },
                        { offset: 1, color: 'rgba(255, 255, 255, 0)', alpha: 1 },
                    ],
                    fade * 0.95
                );
            }

            context.restore();
        }

        function render(now) {
            animationFrame = 0;
            const easing = pointer.active ? 0.1 : 0.05;
            pointer.x += (pointer.targetX - pointer.x) * easing;
            pointer.y += (pointer.targetY - pointer.y) * easing;
            pointer.velocityX = pointer.velocityX * 0.82 + (pointer.targetX - pointer.x) * 0.18;
            pointer.velocityY = pointer.velocityY * 0.82 + (pointer.targetY - pointer.y) * 0.18;

            drawFrame(now);

            const idleTime = now - lastPointerTime;
            const isAlive = idleTime < 2200;
            pointer.active = idleTime < 180;

            if (isAlive) {
                animationFrame = window.requestAnimationFrame(render);
            }
        }

        function startRenderLoop() {
            if (!animationFrame) {
                animationFrame = window.requestAnimationFrame(render);
            }
        }

        function handlePointerMove(event) {
            pointer.targetX = event.clientX;
            pointer.targetY = event.clientY;
            const deltaX = event.movementX || pointer.targetX - pointer.x;
            const deltaY = event.movementY || pointer.targetY - pointer.y;
            pointer.velocityX = pointer.velocityX * 0.6 + deltaX * 0.4;
            pointer.velocityY = pointer.velocityY * 0.6 + deltaY * 0.4;
            pointer.active = true;
            lastPointerTime = performance.now();
            startRenderLoop();
        }

        function handlePointerLeave() {
            pointer.active = false;
            lastPointerTime = performance.now();
            startRenderLoop();
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerdown', handlePointerMove, { passive: true });
        window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
        startRenderLoop();
    }

    function initCommonUi() {
        const menuButton = document.getElementById('menuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (menuButton && mobileMenu) {
            menuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        const revealElements = document.querySelectorAll('.reveal');
        if (revealElements.length > 0 && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            }, { threshold: 0.1 });

            revealElements.forEach(element => observer.observe(element));
        } else {
            revealElements.forEach(element => element.classList.add('active'));
        }

        const navPill = document.getElementById('navPill');
        if (navPill) {
            const updateNavState = () => {
                navPill.classList.toggle('nav-scrolled', window.scrollY > 50);
            };

            updateNavState();
            window.addEventListener('scroll', updateNavState, { passive: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initCursorAmbientBackground();
            initCommonUi();
        });
    } else {
        initCursorAmbientBackground();
        initCommonUi();
    }
})();