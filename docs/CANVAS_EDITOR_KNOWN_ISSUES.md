## Canvas Editor: Known Issues

Last updated: 2025-08-14

This document tracks currently observed UX/state issues in the canvas editor to aid triage and resolution.

---

### CE-001: Sidebar tabs re-open when clicking an already-selected element after closing the tab

- **Summary**: While an element or group is selected, closing the right-sidebar tab (Properties/Animations) via its close "x" should keep the tab closed until selection actually changes. Currently, clicking the same selected element re-opens the tab.
- **Steps to reproduce**:
  1. Select an element or group on the canvas.
  2. In the right sidebar, close the visible tab (Properties or Animations) using the close "x".
  3. Click the same element again on the canvas (it's still selected at this point we never deselected, we're just clicking on it on the canvas maybe to drag it).
- **Expected behavior**: Sidebar tabs remain closed. Tabs only open when the selection changes (e.g., a different element is selected or selection transitions from none to some) or when user clicks the right-sidebar tab icon.
- **Actual behavior**: Sidebar tabs re-open despite the selection being unchanged.
- **Impact/Severity**: Medium. Causes distracting UI flicker and unintentionally exposes panels, breaking focus.
- **Notes / Proposed direction**:
  - Treat panel visibility as independent UI state that only toggles open on selection-change events, not on selection-confirmation (re-click) events.
  - Guard against duplicate selection events reopening panels when `selectedId` remains the same.

---

### CE-002: Element becomes deselected after drag completes

- **Summary**: Completing a drag interaction appears to clear the current selection.
- **Steps to reproduce**:
  1. Select an element on the canvas.
  2. Drag the element to a new position.
  3. Release the mouse to end the drag.
- **Expected behavior**: The element remains selected after drag end to enable immediate property edits or subsequent actions.
- **Actual behavior**: The element is deselected upon drag end.
- **Impact/Severity**: Medium–High. Interrupts common workflows (move then tweak), forcing extra clicks and causing state loss for dependent UI.
- **Notes / Proposed direction**:
  - Ensure drag-end does not emit a deselect action. Maintain `selectedId` unless an explicit deselect is triggered.
  - Verify that hit-testing or focus handling at drag-end does not inadvertently clear selection.

---

### CE-003: Property/animation changes are not persisted unless the canvas structure changes

- **Summary**: Edits to element/group properties (e.g., rotation, dimensions) or animations do not persist on save if no structural canvas changes (like adding shapes) occur. On reload, these edits are lost.
- **Steps to reproduce**:
  1. Select an element or group.
  2. Change one or more properties (rotation, width/height) or update animations.
  3. Save the project without adding/removing shapes.
  4. Reload the project.
- **Expected behavior**: All property and animation changes persist regardless of whether new shapes were added or other structural changes occurred.
- **Actual behavior**: The property/animation updates are not persisted and are missing after reload when no structural changes were made.
- **Impact/Severity**: High. Leads to silent data loss of user edits and undermines trust in save operations.
- **Notes / Proposed direction**:
  - Ensure the save pipeline considers property/animation mutations as dirty changes that must be serialized and persisted.
  - Decouple "canvas structural changes" from the condition that determines whether a save is required; compute a comprehensive dirty state including property and animation diffs.
  - Consider event-driven persistence (e.g., debounced commits on property change) in addition to explicit saves.

---

### CE-004: Deleted elements reappear after reload when a delete is followed by an add before save

- **Summary**: If an element is removed from the canvas and a new element is added in the same editing session, after saving and reloading, the previously removed element reappears.
- **Steps to reproduce**:
  1. Open a canvas with at least one element.
  2. Delete one existing element.
  3. Add a new element.
  4. Save the project.
  5. Reload the page and fetch the canvas.
- **Expected behavior**: The deleted element remains deleted; only the newly added element and the remaining elements are present after reload.
- **Actual behavior**: The deleted element reappears after reload, indicating the delete operation was not persisted correctly when combined with an add before save.
- **Impact/Severity**: High–Critical. Users perceive lost work and inconsistent state; risk of duplicate/ghost elements and confusion.
- **Notes / Proposed direction**:
  - Ensure deletion operations are represented and persisted in the save payload (e.g., as explicit removals or via full-state replacement).
  - Audit merge semantics server-side: confirm that server applies deletes before adds or that the persistence model is authoritative (snapshot over patch) and handles removals.
  - Verify element identity handling (IDs) and that newly added elements do not collide or cause rollback of the deletion.
  - Add tests for sequences: delete-only, add-only, delete-then-add, add-then-delete within a single save.

---

## Enhancements / UX Requests

### CE-FEAT-001: Line tool supports straight and curved lines with a mini toolbar selector

- **Summary**: The Line tool should allow users to choose between straight lines and curved lines. Clicking the Line tool opens a small, inline toolbar to pick the line type before drawing.
- **UX requirements**:
  - When the user selects the Line tool, display a mini toolbar near the cursor/tool origin offering two options: "Straight" and "Curved".
  - The chosen type applies to the next line drawn and remains the default for subsequent uses until changed or the tool is exited.
  - The mini toolbar should be dismissible (e.g., clicking outside or pressing Escape) without changing the previously selected type.
  - Provide clear icons/tooltips for both options.
- **Behavioral details**:
  - Straight line: click-drag to set start and end points; shows endpoint handles on selection for later edits.
  - Curved line: supports at least a quadratic or cubic Bézier with visible control handles on selection for curvature adjustments.
  - Model representation includes a `lineType` property: `"straight" | "curved"` and persists accordingly.
  - Rendering and hit-testing support both line types; selection highlights endpoints and, for curved lines, control points.
- **Acceptance criteria**:
  - Mini toolbar appears upon activating the Line tool and allows selecting line type.
  - Drawn lines reflect the selected type and persist across save/reload.
  - Editing preserves type and exposes appropriate handles.
  - Keyboard/mouse interactions remain consistent with other shape tools.
- **Notes / Proposed direction**:
  - Start with quadratic Bézier for simplicity; consider cubic extensibility.
  - Add schema and migration for `lineType` if not present; ensure serialization/deserialization compatibility.
  - Include tests for persistence, editing, and rendering of both types.


