/* ==========================================================================
   BROTHERS | app.js
   --------------------------------------------------------------------------
   Módulos: WhatsApp, preloader, scroll suave, titulares, reveals, navegación,
   hero (partículas + parallax), cinta, servicios, imagen que se abre, galería,
   pan horizontal, bento, método, FAQ, formulario y WhatsApp flotante.

   Reglas del proyecto
   - Sin listeners de "scroll": se usa IntersectionObserver, ScrollTrigger y CSS.
   - Todo movimiento respeta prefers-reduced-motion.
   - Si GSAP / Lenis no cargan, la página queda completa y usable (sin pines).
   ========================================================================== */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---- Configuración del negocio ---- */
  const WA_NUMBER = '523223194316'; // +52 322 319 4316

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
  const hasLenis = typeof window.Lenis === 'function';

  clearTimeout(window.__failsafe);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  const readyCallbacks = [];
  const onReady = (fn) => readyCallbacks.push(fn);

  /* ======================================================================
     1. WhatsApp: cada enlace [data-wa] arma su mensaje
     ====================================================================== */
  const waUrl = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  $$('[data-wa]').forEach((a) => {
    if (a.dataset.msg) a.href = waUrl(a.dataset.msg);
  });

  /* ======================================================================
     2. Scroll suave (Lenis) integrado con ScrollTrigger
     ====================================================================== */
  let lenis = null;
  if (hasLenis && !reduce) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.stop(); // se libera cuando termina el preloader
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const lockScroll = (lock) => {
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
    else { document.body.style.overflow = lock ? 'hidden' : ''; }
  };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ======================================================================
     3. Preloader
     ====================================================================== */
  const loader = $('#loader');
  const pctEl = $('#loaderPct');
  const arc = $('.loader__arc');
  const loaderWords = $$('.loader__word span');

  const finishLoader = () => {
    if (loader) loader.classList.add('is-done');
    setTimeout(() => {
      doc.classList.remove('is-loading');
      doc.classList.add('is-ready');
      if (lenis) lenis.start();
      readyCallbacks.forEach((fn) => fn());
      if (hasGSAP) ScrollTrigger.refresh();
    }, reduce ? 40 : 700);
    if (loader) setTimeout(() => loader.remove(), reduce ? 300 : 1800);
  };

  if (loader && pctEl && arc) {
    let progress = 0;
    let loaded = document.readyState === 'complete';
    const t0 = performance.now();
    // Primera visita de la sesión: animación completa. Visitas siguientes: breve.
    let seen = false;
    try { seen = sessionStorage.getItem('brothers:intro') === '1'; sessionStorage.setItem('brothers:intro', '1'); } catch (_) { /* sin storage */ }
    const MIN = reduce ? 250 : seen ? 900 : 2100;
    const MAX = 5200;                 // y nunca bloquea más que esto
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    const setProgress = (p) => {
      pctEl.textContent = String(Math.round(p));
      arc.style.strokeDashoffset = String(100 - p);
      const idx = p < 34 ? 0 : p < 68 ? 1 : 2;
      loaderWords.forEach((w, i) => w.classList.toggle('is-on', i === idx));
    };
    const tick = (now) => {
      const el = now - t0;
      const done = (loaded && el >= MIN) || el >= MAX;
      const target = done ? 100 : Math.min(88, (el / MIN) * 88);
      progress += (target - progress) * (reduce ? 0.6 : 0.07);
      if (done && progress > 99.3) progress = 100;
      setProgress(progress);
      if (progress < 100) requestAnimationFrame(tick);
      else finishLoader();
    };
    requestAnimationFrame(tick);
  } else {
    finishLoader();
  }

  /* ======================================================================
     4. Titulares: separación por palabras + reveals con IntersectionObserver
     ====================================================================== */
  const splitWords = (el) => {
    let idx = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'w__in';
            inner.textContent = part;
            inner.style.setProperty('--wi', String(idx++));
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add('has-words');
  };

  // Rutinas de entrada escalonada dentro de cada tarjeta de servicio
  $$('.svc__copy > *').forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.setProperty('--d', `${(i % 7) * 0.06}s`);
  });
  $$('.svc__media').forEach((el) => el.setAttribute('data-reveal', ''));
  // Galería: entrada escalonada por columna
  $$('.tile').forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.setProperty('--d', `${(i % 4) * 0.08}s`);
  });

  $$('[data-split]').forEach(splitWords);

  // Frase de marca: cada palabra en su propio span para encenderla con el scroll
  const statement = $('#statementText');
  if (statement) {
    const wrap = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'sw';
            s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) wrap(child);
      });
    };
    wrap(statement);
  }

  const revealObs = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split]').forEach((el) => revealObs.observe(el));

  /* ======================================================================
     5. Navegación: estado, enlace activo, menú móvil, anclas
     ====================================================================== */
  const nav = $('#nav');
  const toggle = $('#navToggle');
  const menu = $('#menu');

  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);

  const navLinks = $$('.nav__links a');
  const linkById = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const a = linkById.get(en.target.id);
      if (!a || !en.isIntersecting) return;
      navLinks.forEach((l) => l.removeAttribute('aria-current'));
      a.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  linkById.forEach((_, id) => { const s = document.getElementById(id); if (s) sectionObs.observe(s); });

  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    lockScroll(open);
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches && menu.classList.contains('is-open')) setMenu(false);
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (menu.classList.contains('is-open')) setMenu(false);
    const offset = target.classList.contains('svc') ? -96 : 0;
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', id);
  });

  // Si llegan con un enlace tipo /#proyectos, se va ahí al terminar el preloader
  const initialHash = location.hash;
  onReady(() => {
    if (!initialHash) return;
    const t = document.querySelector(initialHash);
    if (t) t.scrollIntoView({ behavior: 'auto', block: 'start' });
  });

  /* ======================================================================
     6. Botones: brillo que sigue el cursor + efecto magnético
     ====================================================================== */
  $$('.btn').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      btn.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.2;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
        el.style.translate = `${x}px ${y}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = '0px 0px'; });
    });
  }

  /* ======================================================================
     7. Hero: entrada, parallax con el cursor y partículas (aire + energía)
     ====================================================================== */
  const hero = $('#inicio');
  const heroTitle = $('#hero-title');
  if (heroTitle) {
    splitWords(heroTitle);
    heroTitle.style.setProperty('--wd', '.2s');
    onReady(() => heroTitle.classList.add('in'));
  }

  const mouse = { x: -9999, y: -9999, active: false };

  if (hero && finePointer && !reduce) {
    const visual = $('#heroVisual');
    const photo = $('.hero__photo');
    const glow = $('#heroGlow');
    const s = { tx: 0, ty: 0, x: 0, y: 0, gx: 0, gy: 0, tgx: 0, tgy: 0, running: false };

    const loop = () => {
      s.x += (s.tx - s.x) * 0.07;
      s.y += (s.ty - s.y) * 0.07;
      s.gx += (s.tgx - s.gx) * 0.12;
      s.gy += (s.tgy - s.gy) * 0.12;
      visual.style.translate = `${(s.x * -28).toFixed(2)}px ${(s.y * -22).toFixed(2)}px`;
      photo.style.translate = `${(s.x * 24).toFixed(2)}px ${(s.y * 18).toFixed(2)}px`;
      glow.style.translate = `${s.gx.toFixed(1)}px ${s.gy.toFixed(1)}px`;
      const settled = Math.abs(s.tx - s.x) < 0.0006 && Math.abs(s.ty - s.y) < 0.0006
        && Math.abs(s.tgx - s.gx) < 0.3 && Math.abs(s.tgy - s.gy) < 0.3;
      if (settled) { s.running = false; return; }
      requestAnimationFrame(loop);
    };
    const kick = () => { if (!s.running) { s.running = true; requestAnimationFrame(loop); } };

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      s.tx = (e.clientX - r.left) / r.width - 0.5;
      s.ty = (e.clientY - r.top) / r.height - 0.5;
      s.tgx = e.clientX - r.left;
      s.tgy = e.clientY - r.top;
      mouse.x = s.tgx; mouse.y = s.tgy; mouse.active = true;
      glow.style.opacity = '1';
      kick();
    });
    hero.addEventListener('pointerleave', () => {
      s.tx = 0; s.ty = 0; mouse.active = false;
      glow.style.opacity = '0';
      kick();
    });
  }

  const initParticles = (canvas, host) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const TAU = Math.PI * 2;
    let w = 0, h = 0, parts = [], raf = 0, last = 0, time = 0;
    let visible = true;

    const glowSprite = (rgb) => {
      const size = 64;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gr.addColorStop(0, `rgba(${rgb},1)`);
      gr.addColorStop(0.22, `rgba(${rgb},.5)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, size, size);
      return c;
    };
    const streakSprite = (rgb) => {
      const c = document.createElement('canvas');
      c.width = 160; c.height = 6;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 160, 0);
      gr.addColorStop(0, `rgba(${rgb},0)`);
      gr.addColorStop(0.75, `rgba(${rgb},.7)`);
      gr.addColorStop(1, `rgba(${rgb},1)`);
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(80, 3, 80, 2.2, 0, 0, TAU);
      g.fill();
      return c;
    };
    const sprites = { amber: glowSprite('255,178,30'), blue: glowSprite('77,155,255'), streak: streakSprite('96,165,255') };

    const build = () => {
      const n = clamp(Math.round((w * h) / 15000), 34, 100);
      parts = [];
      for (let i = 0; i < n; i++) {
        if (i % 100 < 52) {
          // "Aire": estelas azules que fluyen en horizontal con ondulación
          parts.push({ k: 0, x: Math.random() * w, y0: Math.random() * h, y: 0, vx: 0.35 + Math.random(), amp: 6 + Math.random() * 28, fr: 0.5 + Math.random() * 1.1, ph: Math.random() * TAU, len: 50 + Math.random() * 110, a: 0.14 + Math.random() * 0.3, ox: 0, oy: 0 });
        } else {
          // "Energía": chispas ámbar que suben y titilan
          parts.push({ k: 1, x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: -(0.12 + Math.random() * 0.45), r: 3 + Math.random() * 8, ph: Math.random() * TAU, fr: 0.6 + Math.random() * 1.6, tone: Math.random() < 0.8 ? 'amber' : 'blue', ox: 0, oy: 0 });
        }
      }
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduce) draw(0);
    };

    const draw = (dt) => {
      time += dt * 0.0167;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const R = 150;
      for (const p of parts) {
        if (p.k === 0) {
          p.x += p.vx * dt;
          if (p.x - p.len > w) { p.x = -20; p.y0 = Math.random() * h; }
          p.y = p.y0 + Math.sin(time * p.fr * 1.4 + p.ph + p.x * 0.004) * p.amp;
        } else {
          p.x += (p.vx + Math.sin(time * 1.6 + p.ph) * 0.12) * dt;
          p.y += p.vy * dt;
          if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
          if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        }
        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 5;
            p.ox += (dx / d) * f; p.oy += (dy / d) * f;
          }
        }
        p.ox *= 0.93; p.oy *= 0.93;
        const x = p.x + p.ox, y = p.y + p.oy;
        if (p.k === 0) {
          ctx.globalAlpha = p.a;
          ctx.drawImage(sprites.streak, x - p.len, y - 1.6, p.len, 3.2);
        } else {
          const tw = 0.35 + 0.65 * (Math.sin(time * p.fr * 3.2 + p.ph) * 0.5 + 0.5);
          const r = p.r * (0.7 + tw * 0.5);
          ctx.globalAlpha = tw * 0.9;
          ctx.drawImage(p.tone === 'amber' ? sprites.amber : sprites.blue, x - r, y - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;
      draw(dt);
    };
    const start = () => { if (!raf && visible && !document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(host);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    resize();
    start();
  };
  const heroCanvas = $('#heroCanvas');
  if (heroCanvas) initParticles(heroCanvas, heroCanvas.parentElement);

  /* ======================================================================
     8. Cinta de servicios (único marquee): duplica la lista para un bucle
        continuo y se acelera con la velocidad del scroll
     ====================================================================== */
  const bandTrack = $('#bandTrack');
  if (bandTrack) {
    const list = $('.band__list', bandTrack);
    const base = list.cloneNode(true);
    const copies = Math.max(1, Math.ceil(2600 / (list.offsetWidth || 1600)));
    bandTrack.textContent = '';
    for (let i = 0; i < copies * 2; i++) {
      const c = base.cloneNode(true);
      if (i > 0) c.setAttribute('aria-hidden', 'true');
      bandTrack.appendChild(c);
    }
  }

  /* ======================================================================
     9. Animaciones con GSAP / ScrollTrigger
     ====================================================================== */
  if (hasGSAP) {
    const mm = gsap.matchMedia();

    // 9.1 Barra de progreso (solo si el navegador no soporta scroll-timeline en CSS)
    if (!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'))) {
      gsap.to('#progressBar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.2 } });
    }

    // 9.2 Hero: el contenido sube más lento y el fondo se queda atrás
    if (hero && !reduce) {
      gsap.to('.hero__inner', { yPercent: -10, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__bg', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    // 9.3 Cinta: acelera con la velocidad del scroll y vuelve a su ritmo
    if (bandTrack && !reduce) {
      const anim = bandTrack.getAnimations()[0];
      if (anim) {
        let boost = 0, target = 0;
        ScrollTrigger.create({
          trigger: '.band', start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => { target = Math.min(Math.abs(self.getVelocity()) / 650, 7); },
        });
        gsap.ticker.add(() => {
          target *= 0.93;
          boost += (target - boost) * 0.08;
          anim.playbackRate = 1 + boost;
        });
      }
    }

    // 9.3b Frase de marca: las palabras se encienden con el scroll
    const swords = $$('#statementText .sw');
    if (swords.length && !reduce) {
      gsap.fromTo(swords, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: '#statementText', start: 'top 82%', end: 'bottom 46%', scrub: true },
      });
    }

    // 9.4 Servicios: parallax interno + pila con escala (solo escritorio alto)
    if (!reduce) {
      $$('.svc__img--main img').forEach((img) => {
        gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.closest('.svc__img'), start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      $$('.svc__img--float').forEach((el) => {
        gsap.fromTo(el, { y: 26 }, { y: -26, ease: 'none', scrollTrigger: { trigger: el.closest('.svc__card'), start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
    mm.add('(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
      const cards = $$('.svc');
      cards.forEach((svc, i) => {
        if (i === cards.length - 1) return;
        gsap.to($('.svc__card', svc), {
          scale: 0.93, ease: 'none',
          scrollTrigger: { trigger: cards[i + 1], start: 'top 92%', end: 'top 22%', scrub: true },
        });
      });
    });

    // 9.5 Imagen que se abre a pantalla completa
    const revealPin = $('#revealPin');
    if (revealPin) {
      const buildReveal = (desktop) => {
        const frame = $('#revealFrame');
        const img = $('img', frame);
        const L = $('#revealL'), R = $('#revealR');
        const copy = $('#revealCopy'), shade = $('#revealShade');
        doc.classList.add('has-reveal');

        // Mismas medidas que usa el CSS para el hueco central del título
        const dims = () => {
          const vw = revealPin.clientWidth, vh = revealPin.clientHeight;
          const fw = desktop ? Math.min(vw * 0.34, 440) : vw * 0.62;
          const fh = desktop ? Math.min(vh * 0.6, 520) : Math.min(vh * 0.42, 420);
          return { fh, sx: (vw - fw) / 2, sy: (vh - fh) / 2 };
        };
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: revealPin, start: 'top top', end: '+=190%', pin: true, scrub: 0.8,
            anticipatePin: 1, invalidateOnRefresh: true,
            onRefresh: () => revealPin.style.setProperty('--fh', `${dims().fh}px`),
          },
        });
        tl.fromTo(frame,
          { clipPath: () => { const d = dims(); return `inset(${d.sy}px ${d.sx}px ${d.sy}px ${d.sx}px round 28px)`; } },
          { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1, ease: 'power2.inOut' }, 0)
          .fromTo(img, { scale: 1.4 }, { scale: 1, duration: 1.15 }, 0)
          .to(L, desktop ? { xPercent: -140, autoAlpha: 0, duration: 0.8, ease: 'power2.in' } : { yPercent: -160, autoAlpha: 0, duration: 0.8, ease: 'power2.in' }, 0.08)
          .to(R, desktop ? { xPercent: 140, autoAlpha: 0, duration: 0.8, ease: 'power2.in' } : { yPercent: 160, autoAlpha: 0, duration: 0.8, ease: 'power2.in' }, 0.08)
          .to(shade, { opacity: 1, duration: 0.5 }, 0.55)
          .fromTo(copy, { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 0.85)
          .to({}, { duration: 0.4 });
        return () => doc.classList.remove('has-reveal');
      };
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => buildReveal(true));
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => buildReveal(false));
    }

    // 9.6 Electricidad: el scroll vertical avanza el carril en horizontal
    const panPin = $('#panPin'), panTrack = $('#panTrack');
    if (panPin && panTrack) {
      mm.add('(min-width: 1024px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)', () => {
        doc.classList.add('has-pan');
        const dist = () => Math.max(0, panTrack.scrollWidth - panPin.clientWidth);
        const tween = gsap.to(panTrack, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: panPin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
        });
        $$('.pan__card img', panTrack).forEach((img) => {
          gsap.fromTo(img, { xPercent: -7 }, {
            xPercent: 7, ease: 'none',
            scrollTrigger: { trigger: img.closest('.pan__card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
          });
        });
        return () => doc.classList.remove('has-pan');
      });
    }

    // 9.7 Footer: el wordmark sube al llegar
    const giant = $('.footer__giant img');
    if (giant && !reduce) {
      gsap.fromTo(giant, { yPercent: 38 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer__giant', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    }

    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ======================================================================
     10. Galería: filtros + lightbox
     ====================================================================== */
  const tiles = $$('.tile');
  const chips = $$('.chip[data-filter]');
  const refreshLater = (() => {
    let t;
    return (ms = 120) => { clearTimeout(t); t = setTimeout(() => hasGSAP && ScrollTrigger.refresh(), ms); };
  })();

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.filter;
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      let n = 0;
      tiles.forEach((t) => {
        const show = cat === 'all' || t.dataset.cat === cat;
        t.classList.remove('is-entering');
        t.classList.toggle('is-hidden', !show);
        if (show) {
          void t.offsetWidth; // reinicia la animación
          t.style.setProperty('--ed', `${Math.min(n, 12) * 0.045}s`);
          t.classList.add('is-entering');
          n++;
        }
      });
      refreshLater(800);
    });
  });

  const dlg = $('#lightbox');
  if (dlg && typeof dlg.showModal === 'function') {
    const img = $('#lbImg'), cap = $('#lbCap');
    let list = [], current = 0, opener = null;

    const show = () => {
      const btn = list[current];
      const thumb = $('img', btn);
      img.classList.remove('is-swap');
      void img.offsetWidth;
      img.src = btn.dataset.full;
      img.alt = thumb.alt;
      img.width = Number(btn.dataset.w) || 1600;
      img.height = Number(btn.dataset.h) || 1204;
      cap.textContent = thumb.alt;
      img.classList.add('is-swap');
      // Precarga de vecinas para que el cambio sea instantáneo
      [1, -1].forEach((d) => { const n = list[(current + d + list.length) % list.length]; if (n) new Image().src = n.dataset.full; });
    };
    const step = (d) => { current = (current + d + list.length) % list.length; show(); };

    $$('.tile__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        list = $$('.tile:not(.is-hidden) .tile__btn');
        current = list.indexOf(btn);
        opener = btn;
        show();
        dlg.showModal();
        lockScroll(true);
      });
    });
    $('#lbClose').addEventListener('click', () => dlg.close());
    $('#lbPrev').addEventListener('click', () => step(-1));
    $('#lbNext').addEventListener('click', () => step(1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { lockScroll(false); if (opener) opener.focus({ preventScroll: true }); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
    // Deslizar para cambiar de foto en pantallas táctiles
    let sx = 0, sy = 0;
    dlg.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    dlg.addEventListener('pointerup', (e) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    });
  }

  /* ======================================================================
     11. Bento: luz que sigue el cursor
     ====================================================================== */
  $$('.cell').forEach((cell) => {
    cell.addEventListener('pointermove', (e) => {
      const r = cell.getBoundingClientRect();
      cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
      cell.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ======================================================================
     12. Método: línea de tiempo con progreso
     ====================================================================== */
  const timeline = $('#timeline');
  if (timeline) {
    const steps = $$('.step', timeline);
    const setRail = () => {
      if (steps.length < 2) return;
      const h = steps[steps.length - 1].offsetTop - steps[0].offsetTop;
      timeline.style.setProperty('--rail-h', `${h}px`);
    };
    setRail();
    window.addEventListener('resize', setRail);

    if (hasGSAP && !reduce) {
      const nodes = steps.map((s) => $('.step__node', s));
      const update = () => {
        const line = window.innerHeight * 0.62;
        const firstY = nodes[0].getBoundingClientRect().top + nodes[0].offsetHeight / 2;
        const railH = parseFloat(getComputedStyle(timeline).getPropertyValue('--rail-h')) || 1;
        timeline.style.setProperty('--p', clamp((line - firstY) / railH, 0, 1).toFixed(4));
        steps.forEach((s, i) => {
          const y = nodes[i].getBoundingClientRect().top + nodes[i].offsetHeight / 2;
          s.classList.toggle('is-on', y <= line);
        });
      };
      ScrollTrigger.create({ trigger: timeline, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: () => { setRail(); update(); } });
    } else {
      // Sin GSAP o con movimiento reducido: todo visible y en estado completo
      steps.forEach((s) => s.classList.add('is-on'));
      timeline.style.setProperty('--p', '1');
    }
  }

  /* ======================================================================
     13. FAQ: acordeón accesible (un panel abierto a la vez)
     ====================================================================== */
  const items = $$('.acc__item');
  items.forEach((item) => {
    const btn = $('.acc__btn', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      items.forEach((it) => {
        it.classList.remove('is-open');
        $('.acc__btn', it).setAttribute('aria-expanded', 'false');
      });
      if (open) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
      refreshLater(700);
    });
  });

  /* ======================================================================
     14. Formulario de contacto → WhatsApp
     ====================================================================== */
  const form = $('#contactForm');
  if (form) {
    const note = $('#formNote');
    const submit = $('#formSubmit');
    const nameInput = $('#f-name');
    const nameErr = $('#nameError');
    const svcErr = $('#serviceError');
    const group = $('.form__group', form);

    const setError = (field, errEl, msg) => {
      errEl.textContent = msg;
      field.classList.toggle('is-invalid', Boolean(msg));
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const service = String(data.get('service') || '');
      const zone = String(data.get('zone') || '').trim();
      const message = String(data.get('message') || '').trim();

      setError(group, svcErr, service ? '' : 'Elige el servicio que necesitas.');
      setError(nameInput.closest('.field'), nameErr, name.length >= 2 ? '' : 'Escribe tu nombre para saber con quién hablamos.');
      if (!service) { $('input[name="service"]', form).focus(); return; }
      if (name.length < 2) { nameInput.focus(); return; }

      const lines = [`Hola Brothers, soy ${name}.`, `Me interesa: ${service}.`];
      if (zone) lines.push(`Zona del proyecto: ${zone}.`);
      if (message) lines.push(message);
      const url = waUrl(lines.join(' '));

      submit.classList.add('is-loading');
      const opened = window.open(url, '_blank', 'noopener');
      if (!opened) window.location.href = url; // si el navegador bloquea la ventana nueva
      setTimeout(() => {
        submit.classList.remove('is-loading');
        note.classList.add('is-success');
        note.innerHTML = `Listo. Abrimos WhatsApp con tu mensaje. Si no se abrió, <a href="${url}" target="_blank" rel="noopener">toca aquí</a>.`;
      }, 900);
    });

    nameInput.addEventListener('input', () => { if (nameInput.value.trim().length >= 2) setError(nameInput.closest('.field'), nameErr, ''); });
    form.addEventListener('change', (e) => { if (e.target.name === 'service') setError(group, svcErr, ''); });
  }

  /* ======================================================================
     15. WhatsApp flotante: aparece al terminar el preloader y saluda una vez
     ====================================================================== */
  const wa = $('#wa');
  if (wa) {
    onReady(() => {
      setTimeout(() => {
        wa.classList.add('is-tip');
        setTimeout(() => wa.classList.remove('is-tip'), 6500);
      }, 5000);
    });
    $('.wa__btn', wa).addEventListener('click', () => wa.classList.remove('is-tip'));
  }
})();
