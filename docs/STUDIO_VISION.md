# Eventium Studio — Vision & Architecture

> Eventium is not a dashboard tool. It is a **studio** where plugins are the data
> backbone and the user builds **anything** on top — dashboards, internal tools,
> sites, reports, apps — with drag-and-drop, visual logic, and code.

## Mental model: Project = its own world

The unit is a **Project**, not a "dashboard". A project owns its pages/views,
data sources, variables, blueprints, custom code, theme and assets — like a
`.sln` in Visual Studio, a Figma file, or a Notion workspace. A "dashboard" is
just **one project type**, one way to start.

## The launcher (OnlyOffice-style)

Creating a project opens a **launcher**: the user picks a type
(Dashboard · Site · App · Report · Blank · …), exactly like choosing Word / Excel
/ PowerPoint. The choice **focuses** the editor — default layout mode, palette,
open panes, publish targets — **without caging it**. Inside, anything is still
possible: drop any component, open the code or blueprint pane, change the layout.

## Non-negotiable engineering rule: everything is registry-driven

**No hardcoded `switch(type)` anywhere.** Project types are
{@link ProjectTypeDescriptor}s in a registry (mirrors the component registry).
Adding a new type = add one descriptor file and register it — the launcher card,
the editor focus, the palette, the layout mode and the publish targets all flow
from the descriptor. This is the extensibility spine; keep it senior and dynamic.

## Layers of the studio

1. **Workspace shell** — dockable, resizable split panes (VS Code / SolidWorks
   feel). Each pane is a view onto the same project: Design · Code · Blueprint ·
   Data · Preview · Layers.
2. **Canvas** — drag components from a palette; direct manipulation (move, resize,
   align, group, layer). Layout modes: `grid` (snap), `free` (absolute canvas),
   `flow` (document). Responsive via constraints/breakpoints.
3. **Data layer** — plugins provide raw data only; the project defines sources,
   variables, and computed/derived values. Freedom-first fields (select + manual
   + id/name search, always).
4. **Logic layer** — blueprint as a dataflow **and** event→action graph; sandboxed
   HTML/JS and React code panels; reactive runtime variables.
5. **Publish layer** — one project, many outputs: interactive tool, broadcast
   wall, embed, shared page, exported spec.

## Definition of done

Nothing is "done" until the whole is coherent and complete, and a stranger would
look at it and say *"someone really built something."* No incremental patches on
the old grid — this replaces it.
