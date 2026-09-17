<template>
  <div class="home-footer-backdrop" aria-hidden="true">
    <div class="footer-glow"></div>
    <svg class="footer-grid" width="100%" height="100%" focusable="false">
      <defs>
        <!-- 90px cells, with a 20px break around each square intersection. -->
        <pattern id="home-footer-grid" width="90" height="90" patternUnits="userSpaceOnUse" x="50%" y="50%">
          <path class="grid-lines" d="M0 45H35 M55 45H90 M45 0V35 M45 55V90" />
          <rect class="grid-node" x="43.2" y="43.2" width="3.6" height="3.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#home-footer-grid)" />
    </svg>
  </div>
</template>

<style scoped>
.home-footer-backdrop {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: clamp(280px, 55vh, 500px);
  overflow: hidden;
  pointer-events: none;
  color: #3c64a0;
}

.footer-grid {
  position: absolute;
  inset: 0;
  mask-image:
    linear-gradient(to bottom, transparent, black 20%, black 80%, transparent),
    linear-gradient(to right, transparent, black 15%, black 85%, transparent);
  mask-composite: intersect;
  -webkit-mask-composite: source-in;
}

.grid-lines {
  fill: none;
  stroke: currentColor;
  stroke-width: 0.5;
  opacity: 0.14;
}

.grid-node {
  fill: currentColor;
  opacity: 0.18;
}

.footer-glow {
  position: absolute;
  inset: 10% -10% -20%;
  background:
    radial-gradient(ellipse at 25% 70%, rgb(26 56 112 / 10%), transparent 45%),
    radial-gradient(ellipse at 50% 65%, rgb(45 95 158 / 16%), transparent 55%),
    radial-gradient(ellipse at 80% 75%, rgb(74 138 196 / 12%), transparent 40%);
  filter: blur(45px);
}

.dark .home-footer-backdrop {
  color: #fff;
}

.dark .grid-lines {
  opacity: 0.05;
}

.dark .grid-node {
  opacity: 0.12;
}

.dark .footer-glow {
  background:
    radial-gradient(ellipse at 25% 70%, rgb(26 56 112 / 30%), transparent 45%),
    radial-gradient(ellipse at 50% 65%, rgb(45 95 158 / 40%), transparent 55%),
    radial-gradient(ellipse at 80% 75%, rgb(74 138 196 / 20%), transparent 40%);
}
</style>
