# Eventium Studio — Master Architecture (the bar & the whole program)

I own this design end to end. This is the level and the complete shape of the
program — not a feature list to chase. Everything below is a decision, not an
option.

## 0. The bar

Desktop-class creative IDE. The ergonomics of **Photoshop** (tool model + options
bar), the docking/document model of **Visual Studio** (dockable tool windows +
document well + layouts), the infinite canvas of **Figma** (ruler/zoom/guides),
and the visual logic of **Unreal Blueprint**. Never a scrolling web page. Every
surface is pro-grade, dense, precise, keyboard-first.

## 1. Application frame (chrome that never scrolls)

- **Menu bar** (top): app menus (Dosya/Düzen/Görünüm/Çalıştır/Yardım), global
  command search (⌘K), Run/Preview, account.
- **Activity bar** (far left, icon rail): switch *perspectives* — Tasarım / Veri /
  Mantık / Önizleme — each perspective is a saved docking layout.
- **Docking space**: fills everything between; see §3.
- **Status bar** (bottom): active tool, zoom %, cursor coords, selection count,
  layout mode, save state, live connection.

## 2. Design system

One token set (already in `globals.css`), dense pro dark theme (+ light), 4px
grid, one icon family, consistent focus rings, subtle motion. No stock cards.

## 3. Window manager (docking)

Engine: **dockview** (keep). The *design* of it:

- **Left**: Araç Kutusu (Toolbox) · Anahat/Katmanlar (Outline/Layers).
- **Center**: Document well — **Tasarımcı**, **Kod**, **Blueprint** as document
  tabs; splittable into tab groups, floatable, resizable.
- **Right**: Özellikler (Inspector) · Veri/Kaynaklar (Data & Sources).
- **Bottom**: Konsol/Çıktı · Sorunlar (Problems) · Değişkenler.
- Everything movable/floatable; **layout presets** per perspective + "Yerleşimi
  sıfırla". Layout persists per browser.

## 4. The canvas (the star: Photoshop + Figma)

- Infinite pannable/zoomable surface: **rulers**, zoom, dot grid, **guides**,
  snapping (grid + sibling), coordinate/size readout. (Foundations exist.)
- **Tool model** (Photoshop toolbar, far-left of canvas): Seç (V) · Taşı (M) ·
  El/Pan (H/space) · Zoom (Z) · Çerçeve/Artboard (F) · Metin (T) · Şekil (R) ·
  Bileşen Yerleştir. The **active tool governs the pointer** and cursor.
- **Options bar** (top of canvas): context options for the active tool
  (snapping, grid size, align, distribute, tool-specific settings).
- Artboards/frames, multi-select/marquee, align/distribute, keyboard nudge,
  duplicate/paste. (Most exist; unify under the tool model.)

## 5. Document model

Designer / Code / Blueprint are views over the project's controls. Buffers +
tab groups + split + float + persistence (via dockview). Double-click a control
→ its Code document; its Blueprint is a sibling document.

## 6. Tool windows (committed)

- **Toolbox** — components/controls to place.
- **Outline/Layers** — tree of controls; reorder, lock, hide, rename.
- **Inspector** — selected control's props, bindings, geometry, interactions.
- **Data & Sources** — plugin sources → entities → fields + variables; drag a
  field onto a control to bind. Kills the "No data" emptiness at the source.
- **Console/Output** — runtime logs, custom-code eval output, errors.
- **Problems** — validation: unbound required slots, bad refs, cycles.
- **Blueprint** — visual logic (React Flow), executable.
- **Preview/Run** — live run of the project as its published type.

## 7. Interaction model

Tool-based pointer, keyboard-first, command palette for everything, consistent
shortcuts, undo/redo everywhere, non-destructive.

## 8. Execution phases (I drive all of them, holding the bar)

1. **Frame & docking**: perspectives (activity bar), layout presets + reset,
   stabilize the canvas inside the dock; Outline/Layers window.
2. **Canvas tool model**: tool strip + options bar + real tools (select/move/
   hand/zoom/place/text/shape) with cursors.
3. **Data & Sources window** (drag-to-bind) + **Problems** + **Console**.
4. **Preview/Run** perspective; blueprint execution wired to controls.
5. **Polish to the bar**: motion, empty states, iconography, consistency.

Done = a stranger opens it and says "someone built a real application." Not
before.
