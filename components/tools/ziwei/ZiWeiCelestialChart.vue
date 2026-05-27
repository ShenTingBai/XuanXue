<!-- Complete redesign v2: "墨韵天星" — Ink Resonance Celestial Chart -->
<!-- Warm ink/paper aesthetic, matching the 墨韵 design system. Static stars. -->
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import { BRANCH_TO_ANGLE, getStarInterpretation } from "~/constants/ziwei";

// ═══════════════════════════════════════════════════════
//  Geometry — SVG viewBox 600×600
// ═══════════════════════════════════════════════════════
const CX = 300;
const CY = 300;

const ORBIT_RINGS = [95, 140, 195, 245, 270] as const;
const LABEL_R = 270;
const CENTER_VOID = 76;

const RADII = {
  major: { min: 120, max: 160 },
  minor: { min: 175, max: 215 },
  adj: { min: 230, max: 265 },
} as const;

const SVG_NS = "http://www.w3.org/2000/svg";

// ═══════════════════════════════════════════════════════
//  Props & Emits (unchanged)
// ═══════════════════════════════════════════════════════
const props = withDefaults(
  defineProps<{
    palaces: IFunctionalPalace[];
    selectedIndex: number;
    mingGongIndex: number;
    isVisible?: boolean;
  }>(),
  { isVisible: true }
);

const emit = defineEmits<{ select: [index: number] }>();

const chartContainer = ref<HTMLDivElement>();
const orbitSvg = ref<SVGSVGElement>();

// ═══════════════════════════════════════════════════════
//  Star data
// ═══════════════════════════════════════════════════════
interface StarDatum {
  name: string;
  colorClass: string;
  radius: number;
  angleDeg: number;
  palaceIdx: number;
  isMajor: boolean;
  isAdj: boolean;
  mutagen: string | null;
}

let starsData: StarDatum[] = [];
const starGroups: SVGElement[] = [];
const sectorLabels: SVGElement[] = [];
let focusedSector = -1;
let highlightGroup: SVGElement | null = null;
let tooltipEl: HTMLDivElement | null = null;

// Classification sets
const MAJOR_NAMES = new Set([
  "紫微",
  "天机",
  "太阳",
  "武曲",
  "天同",
  "廉贞",
  "天府",
  "太阴",
  "贪狼",
  "巨门",
  "天相",
  "天梁",
  "七杀",
  "破军",
]);
const MALEFIC_NAMES = new Set(["陀罗", "擎羊", "火星", "铃星"]);
const AUSPICIOUS_NAMES = new Set([
  "左辅",
  "右弼",
  "文昌",
  "文曲",
  "天魁",
  "天钺",
  "禄存",
  "天马",
]);

const MUTAGEN_MAP: Record<string, string> = { 禄: "lu", 权: "quan", 科: "ke", 忌: "ji" };

function starColorClass(name: string): string {
  if (MAJOR_NAMES.has(name)) return "s-gold";
  if (MALEFIC_NAMES.has(name)) return "s-gray";
  if (AUSPICIOUS_NAMES.has(name)) return "s-jade";
  return "s-ice";
}

// ═══════════════════════════════════════════════════════
//  Build star data from iztro palaces
// ═══════════════════════════════════════════════════════
const PALACE_SECTOR_DEG = 30;

function buildStarData() {
  starsData = [];

  for (const palace of props.palaces) {
    const rawAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] || 0;
    const centreAngle = rawAngle + PALACE_SECTOR_DEG / 2;

    const major = palace.majorStars.map((s) => ({
      name: s.name,
      mutagen: s.mutagen || null,
    }));
    const minor = palace.minorStars.map((s) => ({
      name: s.name,
      mutagen: s.mutagen || null,
    }));
    const adj = palace.adjectiveStars.map((s) => ({
      name: s.name,
      mutagen: s.mutagen || null,
    }));

    const allStars = [...major, ...minor, ...adj];
    const totalCount = allStars.length;

    const bands: {
      list: { name: string; mutagen: string | null }[];
      rMin: number;
      rMax: number;
      ring: number;
    }[] = [
        { list: major, rMin: RADII.major.min, rMax: RADII.major.max, ring: 0 },
        { list: minor, rMin: RADII.minor.min, rMax: RADII.minor.max, ring: 1 },
        { list: adj, rMin: RADII.adj.min, rMax: RADII.adj.max, ring: 2 },
      ];

    let globalIndex = 0;
    for (const { list, rMin, rMax, ring } of bands) {
      const n = list.length;
      if (!n) continue;

      const bandStartIdx = globalIndex;
      const bandEndIdx = globalIndex + n - 1;

      const maxSpread = PALACE_SECTOR_DEG * 0.9;
      const spread = totalCount > 1 ? maxSpread : 0;

      for (let i = 0; i < n; i++) {
        const s = list[i];
        const localIdx = bandStartIdx + i;

        const angleOffset = totalCount > 1
          ? -spread / 2 + (spread / (totalCount - 1)) * localIdx
          : 0;

        const radiusStep = n > 1 ? (rMax - rMin) / (n - 1) : 0;
        const radius = rMin + radiusStep * i;

        starsData.push({
          name: s.name,
          colorClass: starColorClass(s.name),
          radius,
          angleDeg: centreAngle + angleOffset,
          palaceIdx: palace.index,
          isMajor: ring === 0,
          isAdj: ring === 2,
          mutagen: s.mutagen || null,
        });
      }
      globalIndex += n;
    }
  }
}

// ═══════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════
function deg(angle: number) {
  return (angle * Math.PI) / 180;
}

function pol(cx: number, cy: number, a: number, r: number) {
  const rad = deg(a);
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

// ═══════════════════════════════════════════════════════
//  SVG Renderers
// ═══════════════════════════════════════════════════════

/** 0 — SVG defs (selection glow filter only) */
function renderDefs(svg: SVGSVGElement) {
  const defs = document.createElementNS(SVG_NS, "defs");

  const selGlow = document.createElementNS(SVG_NS, "filter");
  selGlow.setAttribute("id", "sel-glow");
  selGlow.setAttribute("x", "-30%");
  selGlow.setAttribute("y", "-30%");
  selGlow.setAttribute("width", "160%");
  selGlow.setAttribute("height", "160%");
  const sb1 = document.createElementNS(SVG_NS, "feGaussianBlur");
  sb1.setAttribute("stdDeviation", "5");
  sb1.setAttribute("result", "blur");
  selGlow.appendChild(sb1);
  const sm = document.createElementNS(SVG_NS, "feMerge");
  const smn1 = document.createElementNS(SVG_NS, "feMergeNode");
  smn1.setAttribute("in", "blur");
  sm.appendChild(smn1);
  const smn2 = document.createElementNS(SVG_NS, "feMergeNode");
  smn2.setAttribute("in", "SourceGraphic");
  sm.appendChild(smn2);
  selGlow.appendChild(sm);
  defs.appendChild(selGlow);

  svg.appendChild(defs);
}

/** 1 — Orbit rings + sector dividers */
function renderOrbitRings(svg: SVGSVGElement) {
  for (let i = 0; i < ORBIT_RINGS.length; i++) {
    const r = ORBIT_RINGS[i];
    const outer = i >= 3;
    const inner = i <= 1;
    const rng = document.createElementNS(SVG_NS, "circle");
    rng.setAttribute("cx", String(CX));
    rng.setAttribute("cy", String(CY));
    rng.setAttribute("r", String(r));
    rng.setAttribute("fill", "none");
    rng.setAttribute("stroke", outer ? "#A89888" : "#C8B8A8");
    rng.setAttribute("stroke-width", outer ? "0.6" : inner ? "0.45" : "0.5");
    rng.setAttribute("opacity", outer ? "0.2" : inner ? "0.15" : "0.18");
    svg.appendChild(rng);
  }

  // Innermost dashed ring
  const innerDash = document.createElementNS(SVG_NS, "circle");
  innerDash.setAttribute("cx", String(CX));
  innerDash.setAttribute("cy", String(CY));
  innerDash.setAttribute("r", String(CENTER_VOID + 2));
  innerDash.setAttribute("fill", "none");
  innerDash.setAttribute("stroke", "#C8B8A8");
  innerDash.setAttribute("stroke-width", "0.4");
  innerDash.setAttribute("opacity", "0.12");
  innerDash.setAttribute("stroke-dasharray", "2,5");
  svg.appendChild(innerDash);

  // Outer boundary ring
  const outerRng = document.createElementNS(SVG_NS, "circle");
  outerRng.setAttribute("cx", String(CX));
  outerRng.setAttribute("cy", String(CY));
  outerRng.setAttribute("r", "280");
  outerRng.setAttribute("fill", "none");
  outerRng.setAttribute("stroke", "#C62828");
  outerRng.setAttribute("stroke-width", "0.6");
  outerRng.setAttribute("opacity", "0.08");
  svg.appendChild(outerRng);

  // Sector dividers
  const branches = [
    "寅",
    "卯",
    "辰",
    "巳",
    "午",
    "未",
    "申",
    "酉",
    "戌",
    "亥",
    "子",
    "丑",
  ];
  for (const br of branches) {
    const a = BRANCH_TO_ANGLE[br] || 0;
    const p1 = pol(CX, CY, a, ORBIT_RINGS[0]);
    const p2 = pol(CX, CY, a, ORBIT_RINGS[4] + 8);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", String(p1.x));
    line.setAttribute("y1", String(p1.y));
    line.setAttribute("x2", String(p2.x));
    line.setAttribute("y2", String(p2.y));
    line.setAttribute("stroke", "#C62828");
    line.setAttribute("stroke-width", "0.3");
    line.setAttribute("opacity", "0.1");
    svg.appendChild(line);
  }
}

/** 3 — Palace labels (seal-stamp style, refined) */
function renderLabels(svg: SVGSVGElement) {
  sectorLabels.length = 0;
  focusedSector = -1;

  for (let i = 0; i < props.palaces.length; i++) {
    const palace = props.palaces[i];
    const angle = (BRANCH_TO_ANGLE[palace.earthlyBranch] || 0) + 15;
    const pos = pol(CX, CY, angle, LABEL_R);
    const isMing = palace.index === props.mingGongIndex;

    const g = document.createElementNS(SVG_NS, "g");
    g.classList.add("sl");
    if (isMing) g.classList.add("sl-ming");
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `${palace.name} ${palace.earthlyBranch}宫`);

    const panelW = isMing ? 56 : 44;
    const panelH = isMing ? 38 : 32;
    const bg = document.createElementNS(SVG_NS, "rect");
    bg.classList.add("sl-bg");
    bg.setAttribute("x", String(pos.x - panelW / 2));
    bg.setAttribute("y", String(pos.y - panelH / 2));
    bg.setAttribute("width", String(panelW));
    bg.setAttribute("height", String(panelH));
    bg.setAttribute("rx", "3");
    g.appendChild(bg);

    // Palace name
    const nameTxt = document.createElementNS(SVG_NS, "text");
    nameTxt.setAttribute("x", String(pos.x));
    nameTxt.setAttribute("y", String(pos.y - 4));
    nameTxt.setAttribute("text-anchor", "middle");
    nameTxt.classList.add("sl-name");
    nameTxt.textContent = palace.name;
    g.appendChild(nameTxt);

    // Earthly branch
    const brTxt = document.createElementNS(SVG_NS, "text");
    brTxt.setAttribute("x", String(pos.x));
    brTxt.setAttribute("y", String(pos.y + 12));
    brTxt.setAttribute("text-anchor", "middle");
    brTxt.classList.add("sl-branch");
    brTxt.textContent = palace.earthlyBranch;
    g.appendChild(brTxt);

    // Hit area
    const hit = document.createElementNS(SVG_NS, "rect");
    hit.setAttribute("x", String(pos.x - panelW / 2 - 3));
    hit.setAttribute("y", String(pos.y - panelH / 2 - 3));
    hit.setAttribute("width", String(panelW + 6));
    hit.setAttribute("height", String(panelH + 6));
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("pointer-events", "all");

    hit.addEventListener("click", () => emit("select", i));
    hit.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        emit("select", i);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        focusLabel((i + 1) % 12);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        focusLabel((i + 11) % 12);
      }
    });

    g.appendChild(hit);
    svg.appendChild(g);
    sectorLabels.push(g);
  }
}

function focusLabel(idx: number) {
  if (focusedSector >= 0 && sectorLabels[focusedSector])
    sectorLabels[focusedSector].setAttribute("tabindex", "-1");
  focusedSector = idx;
  const t = sectorLabels[idx];
  if (t) {
    t.setAttribute("tabindex", "0");
    t.focus();
  }
}

/** 4 — Stars (orbs + labels + mutagen chips) */
function renderStars(svg: SVGSVGElement) {
  starGroups.length = 0;

  for (let i = 0; i < starsData.length; i++) {
    const st = starsData[i];
    const aRad = deg(st.angleDeg);
    const x = CX + Math.cos(aRad) * st.radius;
    const y = CY + Math.sin(aRad) * st.radius;

    const g = document.createElementNS(SVG_NS, "g");
    g.classList.add("sg");
    if (!st.isMajor) g.classList.add("sg-minor");
    if (st.isAdj) g.classList.add("sg-adj");
    g.setAttribute("transform", `translate(${x},${y})`);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", st.name + (st.mutagen ? " 化" + st.mutagen : ""));

    const norm = ((st.angleDeg % 360) + 360) % 360;
    const right = norm > 315 || norm < 45;
    const orbR = st.isAdj ? 4 : st.isMajor ? 9 : 6;
    const gap = orbR + 6;

    // Hit area
    const hitW = 130;
    const hit = document.createElementNS(SVG_NS, "rect");
    hit.setAttribute("x", String(right ? -hitW : -16));
    hit.setAttribute("y", "-20");
    hit.setAttribute("width", String(hitW));
    hit.setAttribute("height", "40");
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("pointer-events", "all");

    hit.addEventListener("click", () => emit("select", st.palaceIdx));
    hit.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        emit("select", st.palaceIdx);
      }
    });
    g.appendChild(hit);

    // Active ring (hidden by default)
    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("r", String(orbR + 6));
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "#C62828");
    ring.setAttribute("stroke-width", "1.5");
    ring.setAttribute("opacity", "0");
    ring.classList.add("sg-ring");
    g.appendChild(ring);

    // Orb
    const orb = document.createElementNS(SVG_NS, "circle");
    orb.setAttribute("r", String(orbR));
    orb.classList.add("sg-orb", st.colorClass);
    g.appendChild(orb);

    // Subtle ink-bleed halo (major stars only)
    if (st.isMajor) {
      const halo = document.createElementNS(SVG_NS, "circle");
      halo.setAttribute("r", String(orbR + 5));
      halo.setAttribute("fill", "none");
      halo.classList.add("sg-halo", st.colorClass);
      g.appendChild(halo);
    }

    // Label
    const label = document.createElementNS(SVG_NS, "text");
    label.classList.add("sg-label");
    label.textContent = st.name;
    label.setAttribute("text-anchor", right ? "end" : "start");
    label.setAttribute("x", String(right ? -gap : gap));
    label.setAttribute("y", st.isAdj ? "4" : st.isMajor ? "5" : "4");
    g.appendChild(label);

    // Mutagen chips
    if (st.mutagen) {
      const ms = st.mutagen.split(",");
      const chipW = 30;
      const chipH = 14;
      const chipY = st.isAdj ? 15 : 21;

      for (let mi = 0; mi < ms.length; mi++) {
        const cls = MUTAGEN_MAP[ms[mi]] || "ji";
        const cg = document.createElementNS(SVG_NS, "g");

        const rx = right ? -gap - chipW : gap;
        const ty = chipY + mi * (chipH + 2);
        const tx = right ? -gap - chipW / 2 : gap + chipW / 2;

        const chipBg = document.createElementNS(SVG_NS, "rect");
        chipBg.setAttribute("x", String(rx));
        chipBg.setAttribute("y", String(ty - chipH / 2));
        chipBg.setAttribute("width", String(chipW));
        chipBg.setAttribute("height", String(chipH));
        chipBg.setAttribute("rx", "2");
        chipBg.classList.add("chip-bg", cls);
        cg.appendChild(chipBg);

        const chipTxt = document.createElementNS(SVG_NS, "text");
        chipTxt.textContent = "化" + ms[mi];
        chipTxt.setAttribute("x", String(tx));
        chipTxt.setAttribute("y", String(ty));
        chipTxt.setAttribute("text-anchor", "middle");
        chipTxt.setAttribute("dominant-baseline", "central");
        chipTxt.classList.add("chip-txt", cls);
        cg.appendChild(chipTxt);

        g.appendChild(cg);
      }
    }

    // Tooltip
    g.addEventListener("mouseenter", (e) => {
      const tip = getTooltip();
      const interp = getStarInterpretation(st.name);
      if (interp) {
        tip.textContent = st.name + ": " + interp;
        tip.classList.add("visible");
      }
      const cr = chartContainer.value!.getBoundingClientRect();
      const gr = (e.currentTarget as SVGElement).getBoundingClientRect();

      const starCenterX = gr.left + gr.width / 2 - cr.left;
      const starCenterY = gr.top + gr.height / 2 - cr.top;

      const norm = ((st.angleDeg % 360) + 360) % 360;
      const isRightSide = norm > 315 || norm < 45;
      const isTopHalf = norm >= 45 && norm <= 225;

      const tooltipOffsetX = isRightSide ? 12 : -(tip.offsetWidth + 12);
      const tooltipOffsetY = isTopHalf ? -(tip.offsetHeight / 2 + 8) : 8;

      tip.style.left = starCenterX + tooltipOffsetX + "px";
      tip.style.top = starCenterY + tooltipOffsetY + "px";
      tip.style.transform = "translateY(-50%)";
      if (!isTopHalf) tip.style.transform = "translateY(0)";
    });
    g.addEventListener("mouseleave", () => {
      if (tooltipEl) tooltipEl.classList.remove("visible");
    });

    svg.appendChild(g);
    starGroups.push(g);
  }
}

function getTooltip(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "star-tooltip";
    chartContainer.value?.appendChild(tooltipEl);
  }
  return tooltipEl;
}

/** 5 — Selection highlight (cinnabar sector) */
function renderHighlight(svg: SVGSVGElement, idx: number) {
  if (highlightGroup) {
    highlightGroup.remove();
    highlightGroup = null;
  }
  if (idx < 0 || !props.palaces[idx]) return;

  const rawAngle = BRANCH_TO_ANGLE[props.palaces[idx].earthlyBranch] || 0;
  const innerR = ORBIT_RINGS[0] - 6;
  const outerR = ORBIT_RINGS[3] + 5;

  const g = document.createElementNS(SVG_NS, "g");
  g.classList.add("hl-group");

  const si = pol(CX, CY, rawAngle, innerR);
  const ei = pol(CX, CY, rawAngle + PALACE_SECTOR_DEG, innerR);
  const so = pol(CX, CY, rawAngle, outerR);
  const eo = pol(CX, CY, rawAngle + PALACE_SECTOR_DEG, outerR);

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    [
      `M ${si.x} ${si.y}`,
      `L ${so.x} ${so.y}`,
      `A ${outerR} ${outerR} 0 0 1 ${eo.x} ${eo.y}`,
      `L ${ei.x} ${ei.y}`,
      `A ${innerR} ${innerR} 0 0 0 ${si.x} ${si.y}`,
      "Z",
    ].join(" ")
  );
  path.setAttribute("fill", "rgba(198,40,40,0.06)");
  path.setAttribute("stroke", "rgba(198,40,40,0.15)");
  path.setAttribute("stroke-width", "0.5");
  path.setAttribute("filter", "url(#sel-glow)");
  g.appendChild(path);

  for (const angleDeg of [rawAngle, rawAngle + PALACE_SECTOR_DEG]) {
    const p1 = pol(CX, CY, angleDeg, innerR);
    const p2 = pol(CX, CY, angleDeg, outerR);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", String(p1.x));
    line.setAttribute("y1", String(p1.y));
    line.setAttribute("x2", String(p2.x));
    line.setAttribute("y2", String(p2.y));
    line.setAttribute("stroke", "rgba(198,40,40,0.3)");
    line.setAttribute("stroke-width", "1.2");
    g.appendChild(line);
  }

  highlightGroup = g;
  svg.appendChild(g);
}

// ═══════════════════════════════════════════════════════
//  Selection update
// ═══════════════════════════════════════════════════════
function updateSelection() {
  sectorLabels.forEach((g, i) => g.classList.toggle("sl-sel", i === props.selectedIndex));
  starGroups.forEach((g, i) => {
    if (starsData[i])
      g.classList.toggle("sg-act", starsData[i].palaceIdx === props.selectedIndex);
  });
  if (orbitSvg.value) renderHighlight(orbitSvg.value, props.selectedIndex);
}

// ═══════════════════════════════════════════════════════
//  Bootstrap
// ═══════════════════════════════════════════════════════
function doRender() {
  const svg = orbitSvg.value;
  if (!svg) return;
  svg.innerHTML = "";

  renderDefs(svg);
  renderOrbitRings(svg);
  renderLabels(svg);
  buildStarData();
  renderStars(svg);
  updateSelection();
}

function init() {
  const c = chartContainer.value;
  if (!c) return;
  if (!c.offsetWidth) {
    const ro = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect.width > 0) {
        ro.disconnect();
        doRender();
      }
    });
    ro.observe(c);
    return;
  }
  doRender();
}

onMounted(() => {
  init();
});

watch(
  () => props.selectedIndex,
  () => {
    updateSelection();
  }
);
watch(
  () => props.palaces,
  () => {
    if (orbitSvg.value) doRender();
  }
);
</script>

<!-- ═══════════════════════════════════════════════════════
     TEMPLATE
     ═══════════════════════════════════════════════════════ -->
<template>
  <div ref="chartContainer" class="celestial-chart relative w-full aspect-square max-w-[620px] mx-auto select-none">
    <svg ref="orbitSvg" class="w-full h-full" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" role="img"
      aria-label="紫微斗数天星图 — 十二宫星曜分布"></svg>

    <!-- Centre seal: 紫微星 -->
    <div
      class="polaris absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center"
      aria-hidden="true">
      <div class="polaris-seal">
        <span class="polaris-char">紫</span>
      </div>
      <span class="polaris-label">紫微星</span>
    </div>
  </div>
</template>

<!-- ═══════════════════════════════════════════════════════
     STYLE — 墨韵 (Ink Resonance) Theme
     Static stars, warm paper tones, cinnabar accents
     ═══════════════════════════════════════════════════════ -->
<style scoped>
/* ── Ink-wash background circle (CSS, not SVG — avoids gradient resolution issues) ── */
.celestial-chart::before {
  content: "";
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center,
      rgba(232, 222, 208, 0.18) 0%,
      rgba(238, 229, 216, 0.08) 55%,
      transparent 75%);
  pointer-events: none;
  z-index: -1;
}

/* ── Palace labels (seal-stamp) ── */
.celestial-chart :deep(.sl) {
  cursor: pointer;
}

.celestial-chart :deep(.sl-bg) {
  fill: rgba(198, 40, 40, 0.05);
  stroke: rgba(198, 40, 40, 0.1);
  stroke-width: 0.5;
  transition: fill 0.3s, stroke 0.3s;
}

.celestial-chart :deep(.sl:hover .sl-bg) {
  fill: rgba(198, 40, 40, 0.1);
  stroke: rgba(198, 40, 40, 0.18);
}

.celestial-chart :deep(.sl-ming .sl-bg) {
  fill: rgba(198, 40, 40, 0.08);
  stroke: rgba(198, 40, 40, 0.18);
  stroke-width: 0.8;
}

.celestial-chart :deep(.sl-sel .sl-bg) {
  fill: rgba(198, 40, 40, 0.12);
  stroke: rgba(198, 40, 40, 0.25);
}

.celestial-chart :deep(.sl-name) {
  font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  fill: #5d4e37;
  opacity: 0.8;
  pointer-events: none;
  transition: opacity 0.3s, fill 0.3s;
}

.celestial-chart :deep(.sl:hover .sl-name) {
  opacity: 0.95;
  fill: #c62828;
}

.celestial-chart :deep(.sl-ming .sl-name) {
  fill: #c62828;
  opacity: 0.85;
}

.celestial-chart :deep(.sl-sel .sl-name) {
  opacity: 0.95;
  fill: #c62828;
}

.celestial-chart :deep(.sl-branch) {
  font-family: "Noto Sans SC", sans-serif;
  font-size: 0.6rem;
  fill: #5d4e37;
  opacity: 0.25;
  pointer-events: none;
}

.celestial-chart :deep(.sl:focus-visible) {
  outline: none;
}

.celestial-chart :deep(.sl:focus-visible .sl-bg) {
  stroke: rgba(198, 40, 40, 0.4);
  stroke-width: 1.2;
}

/* ── Star groups (completely static — no animations) ── */
.celestial-chart :deep(.sg) {
  cursor: pointer;
}

.celestial-chart :deep(.sg:focus-visible) {
  outline: none;
}

.celestial-chart :deep(.sg-orb) {
  transition: transform 0.25s;
}

.celestial-chart :deep(.sg:hover .sg-orb) {
  transform: scale(1.25);
}

.celestial-chart :deep(.sg:focus-visible .sg-orb) {
  transform: scale(1.15);
}

/* Orb colors — matching 墨韵 palette */
.celestial-chart :deep(.sg-orb.s-gold) {
  fill: #c62828;
  stroke: #d4a84b;
  stroke-width: 1.5;
  filter: drop-shadow(0 0 4px rgba(198, 40, 40, 0.2)) drop-shadow(0 0 10px rgba(198, 40, 40, 0.06));
}

.celestial-chart :deep(.sg-orb.s-gray) {
  fill: #5d4e37;
  stroke: rgba(93, 78, 55, 0.2);
  stroke-width: 0.8;
}

.celestial-chart :deep(.sg-orb.s-jade) {
  fill: #4a8c6f;
  stroke: rgba(74, 140, 111, 0.2);
  stroke-width: 0.8;
  filter: drop-shadow(0 0 3px rgba(74, 140, 111, 0.15));
}

.celestial-chart :deep(.sg-orb.s-ice) {
  fill: #6ba8c8;
  stroke: rgba(107, 168, 200, 0.2);
  stroke-width: 0.5;
  filter: drop-shadow(0 0 3px rgba(107, 168, 200, 0.1));
}

/* Subtle ink-bleed halo (major stars only) */
.celestial-chart :deep(.sg-halo) {
  pointer-events: none;
}

.celestial-chart :deep(.sg-halo.s-gold) {
  stroke: rgba(198, 40, 40, 0.06);
  stroke-width: 2;
}

.celestial-chart :deep(.sg-halo.s-jade) {
  stroke: rgba(74, 140, 111, 0.04);
  stroke-width: 1.5;
}

.celestial-chart :deep(.sg-halo.s-ice) {
  stroke: rgba(107, 168, 200, 0.03);
  stroke-width: 1.5;
}

/* Labels */
.celestial-chart :deep(.sg-label) {
  fill: #4a3828;
  opacity: 0.7;
  pointer-events: none;
  font-family: "Noto Sans SC", sans-serif;
  transition: opacity 0.3s, fill 0.3s;
}

.celestial-chart :deep(.sg:not(.sg-minor) .sg-label) {
  font-size: 0.8rem;
  font-weight: 500;
}

.celestial-chart :deep(.sg.sg-minor:not(.sg-adj) .sg-label) {
  font-size: 0.68rem;
  font-weight: 400;
}

.celestial-chart :deep(.sg.sg-adj .sg-label) {
  font-size: 0.62rem;
  font-weight: 400;
}

.celestial-chart :deep(.sg:hover .sg-label) {
  opacity: 0.95;
  fill: #c62828;
}

.celestial-chart :deep(.sg.sg-act .sg-label) {
  opacity: 0.95;
  fill: #c62828;
}

/* Active ring pulse */
.celestial-chart :deep(.sg.sg-act .sg-ring) {
  opacity: 0.4;
  animation: ring-pulse 2.5s ease-out infinite;
}

/* ── Mutagen chips ── */
.celestial-chart :deep(.chip-bg) {
  stroke-width: 0.5;
}

.celestial-chart :deep(.chip-bg.lu) {
  fill: rgba(198, 40, 40, 0.1);
  stroke: rgba(198, 40, 40, 0.18);
}

.celestial-chart :deep(.chip-bg.quan) {
  fill: rgba(74, 140, 111, 0.1);
  stroke: rgba(74, 140, 111, 0.18);
}

.celestial-chart :deep(.chip-bg.ke) {
  fill: rgba(107, 168, 200, 0.1);
  stroke: rgba(107, 168, 200, 0.18);
}

.celestial-chart :deep(.chip-bg.ji) {
  fill: rgba(93, 78, 55, 0.07);
  stroke: rgba(93, 78, 55, 0.12);
}

.celestial-chart :deep(.chip-txt) {
  font-size: 0.6rem;
  pointer-events: none;
  font-family: "Noto Sans SC", sans-serif;
}

.celestial-chart :deep(.chip-txt.lu) {
  fill: #c62828;
}

.celestial-chart :deep(.chip-txt.quan) {
  fill: #4a8c6f;
}

.celestial-chart :deep(.chip-txt.ke) {
  fill: #6ba8c8;
}

.celestial-chart :deep(.chip-txt.ji) {
  fill: #5d4e37;
}

/* ── Tooltip ── */
.celestial-chart :deep(.star-tooltip) {
  position: absolute;
  z-index: 30;
  pointer-events: none;
  background: rgba(245, 240, 232, 0.97);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(198, 40, 40, 0.15);
  border-left: 2px solid #c62828;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-family: "Noto Sans SC", sans-serif;
  font-size: 0.72rem;
  color: #5d4e37;
  max-width: 180px;
  min-width: 120px;
  box-shadow: 0 4px 16px rgba(93, 78, 55, 0.12);
  opacity: 0;
  transition: opacity 0.2s, transform 0.15s;
  line-height: 1.5;
}

.celestial-chart :deep(.star-tooltip.visible) {
  opacity: 1;
  pointer-events: none;
}

/* ── Polaris center (cinnabar seal) ── */
.polaris-seal {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #d44040, #c62828 50%, #8a1b1b);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 14px rgba(93, 78, 55, 0.12), 0 0 35px rgba(93, 78, 55, 0.05),
    inset 0 1px 2px rgba(255, 255, 255, 0.1);
  border: 1.5px solid rgba(212, 168, 75, 0.3);
}

.polaris-char {
  font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
  font-size: 1.8rem;
  color: #d4a84b;
  text-shadow: 0 0 5px rgba(212, 168, 75, 0.2), 0 0 10px rgba(198, 40, 40, 0.15);
  line-height: 1;
}

.polaris-label {
  margin-top: 0.25rem;
  font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: #7a6a5c;
  opacity: 0.4;
}

/* ── Keyframes (only selection pulse remains) ── */
@keyframes ring-pulse {
  0% {
    opacity: 0.4;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .celestial-chart :deep(.sg.sg-act .sg-ring) {
    animation: none !important;
    opacity: 0.2;
  }

  .celestial-chart :deep(.sg-orb) {
    transition: none !important;
  }

  .celestial-chart :deep(.sg:hover .sg-orb) {
    transform: none;
  }
}
</style>
