/* ===========================
   Vishnu Cardhan Rali — Portfolio
   script.js
   =========================== */

// ── CUSTOM CURSOR ──
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top  = my + 'px';
});

function animRing() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(animRing);
}
animRing();

document.querySelectorAll('a, button, .exp-card, .cert-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width  = '20px';
    cursor.style.height = '20px';
    ring.style.width    = '60px';
    ring.style.height   = '60px';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width  = '12px';
    cursor.style.height = '12px';
    ring.style.width    = '40px';
    ring.style.height   = '40px';
  });
});

// ── 3D CARD TILT ──
const card  = document.getElementById('heroCard');
const inner = document.getElementById('heroCardInner');

if (card) {
  card.addEventListener('mousemove', e => {
    const r   = card.getBoundingClientRect();
    const x   = e.clientX - r.left  - r.width  / 2;
    const y   = e.clientY - r.top   - r.height / 2;
    const rx2 = -(y / r.height) * 18;
    const ry2 =  (x / r.width)  * 18;
    inner.style.transform  = `rotateX(${rx2}deg) rotateY(${ry2}deg) scale(1.02)`;
    inner.style.transition = 'transform 0.1s';
  });
  card.addEventListener('mouseleave', () => {
    inner.style.transform  = 'rotateX(0) rotateY(0) scale(1)';
    inner.style.transition = 'transform 0.5s ease';
  });
}

// ── SCROLL REVEAL ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity   = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.exp-card, .cert-card, .skill-group').forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// ── ACTIVE NAV LINK HIGHLIGHT ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-links a[href="#${e.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));
