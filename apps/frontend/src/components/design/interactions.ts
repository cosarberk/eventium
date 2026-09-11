/**
 * @fileoverview Block interaction model (drill-down / cross-filter).
 *
 * Any block can carry an `interaction` entry in its static options. When a
 * viewer clicks the panel (or a row inside a renderer that supports it), the
 * configured action fires:
 *
 *  - `set-variable` — writes a runtime variable (the cross-filter core): other
 *    panels that bind a param to `$name` re-resolve live. The value is either a
 *    static literal or read from the clicked row's field.
 *  - `navigate` — switches the active board (drill-down to a detail page),
 *    optionally seeding a variable from the clicked row first.
 *
 * The config lives in `block.options.interaction`, so it already travels with
 * the portable page spec — no schema surgery needed.
 */

/** What a click does. */
export type InteractionAction = 'set-variable' | 'navigate';

/** Where the written value comes from. */
export type InteractionSource = 'field' | 'static';

/** A row handed to {@link BlockInteractionEmit}: column label → cell value. */
export type InteractionRow = Record<string, string | number | boolean | null>;

/** Fires a block's configured interaction, optionally with the clicked row. */
export type BlockInteractionEmit = (row?: InteractionRow) => void;

/** A block's click interaction configuration. */
export interface BlockInteraction {
  /** The action performed on click. */
  action: InteractionAction;
  /** `set-variable` / `navigate` seed: the variable name to write. */
  variable?: string;
  /** Value source: a clicked-row field, or a static literal. */
  source?: InteractionSource;
  /** `field` source: the column label to read from the clicked row. */
  field?: string;
  /** `static` source: the literal value to write. */
  value?: string;
  /** `navigate`: the target board id to activate. */
  boardId?: string;
}

/** Coerces an unknown to a trimmed non-empty string, or `undefined`. */
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/**
 * Reads and validates a block's interaction config from its options.
 * Returns `null` when nothing usable is configured.
 */
export function readInteraction(options: Record<string, unknown>): BlockInteraction | null {
  const raw = options.interaction;
  if (!raw || typeof raw !== 'object') return null;
  const i = raw as Record<string, unknown>;
  if (i.action !== 'set-variable' && i.action !== 'navigate') return null;

  const config: BlockInteraction = { action: i.action };
  config.variable = str(i.variable);
  config.source = i.source === 'static' ? 'static' : 'field';
  config.field = str(i.field);
  config.value = typeof i.value === 'string' ? i.value : undefined;
  config.boardId = str(i.boardId);

  // Discard configs that can never fire.
  if (config.action === 'set-variable' && !config.variable) return null;
  if (config.action === 'navigate' && !config.boardId) return null;
  return config;
}

/**
 * Lenient read of a block's interaction config for the *editor* — keeps
 * in-progress edits (e.g. a chosen action before a variable name is typed) that
 * {@link readInteraction} would reject. Never returns null for a valid action,
 * so the inspector's controls stay selected while the user fills them in.
 */
export function readInteractionDraft(options: Record<string, unknown>): BlockInteraction | null {
  const raw = options.interaction;
  if (!raw || typeof raw !== 'object') return null;
  const i = raw as Record<string, unknown>;
  if (i.action !== 'set-variable' && i.action !== 'navigate') return null;
  return {
    action: i.action,
    variable: str(i.variable),
    source: i.source === 'static' ? 'static' : 'field',
    field: str(i.field),
    value: typeof i.value === 'string' ? i.value : undefined,
    boardId: str(i.boardId),
  };
}

/**
 * Resolves the value an interaction writes for a given clicked row.
 * `static` uses the literal; `field` reads the row cell by column label.
 */
export function interactionValue(config: BlockInteraction, row?: InteractionRow): string {
  if (config.source === 'static') return config.value ?? '';
  if (config.field && row && config.field in row) {
    const cell = row[config.field];
    return cell === null || cell === undefined ? '' : String(cell);
  }
  return '';
}

/**
 * True when a click on the panel body (rather than a specific row) is enough to
 * fire the interaction: navigation, or a static value that needs no row field.
 */
export function isPanelLevel(config: BlockInteraction): boolean {
  return config.action === 'navigate' || config.source === 'static';
}
