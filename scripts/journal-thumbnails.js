const MODULE_ID = "journal-entry-thumbnails";
const FLAG = "thumbnail";

console.log("📘 Journal Thumbnails module loaded");

/** FilePicker class, without relying on the deprecated global (v13+). */
function getFilePickerClass() {
    return foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
}

/** Re-render the journal directory and the sheet after a change. */
function refresh(sheet) {
    ui.journal?.render();
    sheet?.render();
}

function setThumbnail(sheet) {
    const entry = sheet.document;
    const FP = getFilePickerClass();
    new FP({
        type: "image",
        current: entry.getFlag(MODULE_ID, FLAG) ?? "",
        callback: async path => {
            await entry.setFlag(MODULE_ID, FLAG, path);
            refresh(sheet);
        }
    }).render(true);
}

async function removeThumbnail(sheet) {
    const entry = sheet.document;
    if (!entry.getFlag(MODULE_ID, FLAG)) return;
    await entry.unsetFlag(MODULE_ID, FLAG);
    refresh(sheet);
}

/**
 * Add entries to the window header controls menu (the "⋮" menu).
 * Uses the official ApplicationV2 hook, which works on both v13 (dropdown menu)
 * and v14 (context menu built on the fly).
 */
Hooks.on("getHeaderControlsJournalEntrySheet", (sheet, controls) => {
    if (!game.user.isGM) return;
    if (sheet.document?.pack) return; // Skip compendium journals
    if (controls.some(c => c.action === "jetSetThumbnail")) return;

    // Register action handlers on this sheet instance (used by v13, and by v14 as fallback)
    sheet.options.actions.jetSetThumbnail ??= function () { setThumbnail(this); };
    sheet.options.actions.jetRemoveThumbnail ??= function () { removeThumbnail(this); };

    controls.push(
        {
            action: "jetSetThumbnail",
            icon: "fa-solid fa-image",
            label: "journal-thumbnails.SetThumbnail",
            onClick: () => setThumbnail(sheet)
        },
        {
            action: "jetRemoveThumbnail",
            icon: "fa-solid fa-trash",
            label: "journal-thumbnails.DeleteThumbnail",
            visible: () => !!sheet.document.getFlag(MODULE_ID, FLAG),
            onClick: () => removeThumbnail(sheet)
        }
    );
});

/** Show thumbnails in the journal directory. */
Hooks.on("renderJournalDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : (html?.[0] ?? app.element);
    if (!root) return;

    for (const li of root.querySelectorAll("li.directory-item.journalentry[data-entry-id]")) {
        const entry = game.journal.get(li.dataset.entryId);
        const thumb = entry?.getFlag(MODULE_ID, FLAG);
        if (!thumb || li.querySelector(".journal-thumbnail")) continue;

        const name = li.querySelector(".entry-name");
        if (!name) continue;

        const div = document.createElement("div");
        div.className = "journal-thumbnail";
        div.style.backgroundImage = `url("${thumb.replace(/"/g, '\\"')}")`;
        name.prepend(div);
    }
});
