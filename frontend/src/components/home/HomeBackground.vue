<template>
  <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <!-- Sky gradient background -->
    <div
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e8f1ff_0%,#f4f9ff_45%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#0b1220_0%,#0f172a_60%,#111827_100%)]"
      aria-hidden="true"
    ></div>
    <!-- Soft cloud-like blobs (pure CSS, no external assets) -->
    <div
      class="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(125,178,255,0.35),transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(56,89,170,0.35),transparent_70%)]"
      aria-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute right-[-10%] top-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(167,196,255,0.28),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(40,80,160,0.28),transparent_70%)]"
      aria-hidden="true"
    ></div>
    <!-- Blurred brand wordmark top-right -->
    <div
      aria-hidden="true"
      class="sky-wordmark pointer-events-none absolute -right-12 -top-12 select-none font-black leading-none tracking-tight text-sky-700/25 dark:text-sky-300/20"
    >
      {{ siteName }}
    </div>
    <!-- Fluid backdrop fades out independently of the foreground particles. -->
    <div
      aria-hidden="true"
      class="fluid-hero-bg pointer-events-none absolute inset-x-0 top-0 h-screen overflow-hidden"
    >
      <div class="hero-fluid">
        <canvas ref="fluidCanvas" class="fluid-bg"></canvas>
      </div>
    </div>

    <HomeFooterBackdrop />

    <div class="home-particles pointer-events-none absolute inset-x-0 top-0 z-[1] h-screen" aria-hidden="true">
      <canvas ref="particleCanvas" class="particle-bg"></canvas>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HomeFooterBackdrop from './HomeFooterBackdrop.vue'
import { useHomeEffects } from '@/composables/useHomeEffects'

defineProps<{ siteName: string }>()

const fluidCanvas = ref<HTMLCanvasElement | null>(null)
const particleCanvas = ref<HTMLCanvasElement | null>(null)
useHomeEffects(fluidCanvas, particleCanvas)
</script>

<style scoped>
/* Home hero */
.sky-wordmark {
  font-size: clamp(140px, 22vw, 280px);
  filter: blur(56px);
  letter-spacing: -0.05em;
  white-space: nowrap;
}

/* ============ Fluid hero background (1:1 replica) ============
 * Structure mirrors deepseek.com/harness (and the reference site):
 *   .fluid-hero-bg  — viewport-height container, fluid fades out toward the
 *                     bottom via the mask on .hero-fluid
 *   .fluid-bg       — WebGL 3D simplex domain-warped noise field
 *   .home-particles — separate, unmasked pattern layer above the background */
.hero-fluid {
  position: absolute;
  inset: 0;
  -webkit-mask-image: linear-gradient(#000000fc 0%, #000000e8 8.98%, transparent 100%);
  mask-image: linear-gradient(#000000fc 0%, #000000e8 8.98%, transparent 100%);
}

.fluid-bg,
.particle-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.fluid-bg {
  z-index: 0;
}

.particle-bg {
  z-index: 1;
}

</style>
