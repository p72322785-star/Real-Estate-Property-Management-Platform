const STORAGE_KEY = "estatehub_member3_properties";

function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3000);
}

function getProperties() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveProperties(properties) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

function confirmAction(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement("dialog");
        dialog.className = "confirm-dialog";
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Please confirm</h3>
                <p></p>
                <div class="dialog-actions">
                    <button type="button" class="btn btn-outline" data-cancel>Cancel</button>
                    <button type="button" class="btn btn-danger" data-confirm>Delete</button>
                </div>
            </div>`;
        dialog.querySelector("p").textContent = message;
        dialog.querySelector("[data-cancel]").addEventListener("click", () => {
            dialog.close();
            resolve(false);
        });
        dialog.querySelector("[data-confirm]").addEventListener("click", () => {
            dialog.close();
            resolve(true);
        });
        dialog.addEventListener("close", () => dialog.remove(), { once: true });
        document.body.appendChild(dialog);
        dialog.showModal();
    });
}

function propertyNameFromRow(button) {
    const row = button.closest("tr");
    return row ? row.querySelector(".prop-name")?.textContent.trim() : "";
}

function formatAmount(amount) {
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0
    }).format(Math.round(amount));
}

function updatePropertySummary(tbody) {
    const rows = [...tbody.querySelectorAll("tr")];
    const cards = document.querySelectorAll(".summary-card strong");
    if (cards.length < 4) return;

    const totalValue = rows.reduce((total, row) => {
        const price = Number(row.cells[2]?.textContent.replace(/[^\d.-]/g, ""));
        return total + (Number.isFinite(price) ? price : 0);
    }, 0);

    cards[0].textContent = String(rows.length);
    cards[1].textContent = String(tbody.querySelectorAll(".status-badge.available").length);
    cards[2].textContent = String(tbody.querySelectorAll(".status-badge.rented").length);
    cards[3].textContent = formatAmount(totalValue);
}

function wirePropertyForm() {
    const form = document.querySelector("#propertyForm");
    if (!form) return;

    const isEdit = form.querySelector("[data-delete-property]");
    if (isEdit) {
        const title = document.querySelector("#title");
        const queryTitle = new URLSearchParams(window.location.search).get("property");
        const stored = getProperties().find((item) =>
            item.title === (queryTitle || title.value)
        );
        if (stored) {
            const heading = document.querySelector(".form-card h2");
            if (heading) heading.textContent = stored.title;
            Object.entries(stored).forEach(([name, value]) => {
                const field = form.elements[name];
                if (!field || name === "photos") return;
                if (field.type === "checkbox") {
                    field.checked = Array.isArray(value) ? value.includes(field.value) : field.checked;
                } else {
                    field.value = value;
                }
            });
        }
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = Object.fromEntries(new FormData(form).entries());
        data.amenities = [...form.querySelectorAll(".checkbox-item input:checked")]
            .map((input) => input.parentElement.textContent.trim());
        data.updatedAt = new Date().toISOString();

        const properties = getProperties();
        const oldTitle = document.querySelector(".form-card h2")?.textContent.trim();
        const existingIndex = properties.findIndex((item) => item.title === oldTitle);

        if (existingIndex >= 0) {
            properties[existingIndex] = { ...properties[existingIndex], ...data };
        } else if (isEdit) {
            const currentTitle = document.querySelector("#title").value;
            const index = properties.findIndex((item) => item.title === currentTitle);
            if (index >= 0) properties[index] = { ...properties[index], ...data };
        } else {
            properties.push(data);
        }

        saveProperties(properties);
        showToast(isEdit ? "Property changes saved." : "Property published successfully.");
        window.setTimeout(() => { window.location.href = "my-properties.html"; }, 500);
    });

    const deleteButton = form.querySelector("[data-delete-property]");
    if (deleteButton) {
        deleteButton.addEventListener("click", async () => {
            const title = document.querySelector("#title").value;
            if (await confirmAction(`Delete "${title}" from your listings?`)) {
                saveProperties(getProperties().filter((item) => item.title !== title));
                window.location.href = "my-properties.html";
            }
        });
    }
}

async function wireTableDeletes() {
    document.querySelectorAll("[data-delete-property]").forEach((button) => {
        button.addEventListener("click", async () => {
            const name = propertyNameFromRow(button);
            if (!await confirmAction(`Delete "${name}" from your listings?`)) return;
            const row = button.closest("tr");
            row?.remove();

            const properties = getProperties().filter((item) => item.title !== name);
            saveProperties(properties);

            const tbody = document.querySelector(".dash-table tbody");
            if (tbody) updatePropertySummary(tbody);
            showToast("Property deleted.");
        });
    });
}

function wireMyProperties() {
    const tbody = document.querySelector(".dash-table tbody");
    if (!tbody) return;

    const properties = getProperties();
    properties.forEach((property) => {
        const row = document.createElement("tr");
        const price = Number(property.price) || 0;
        const formattedPrice = formatAmount(price);
        const status = property.status || "Available";
        const statusClass = status.toLowerCase().includes("sold") || status.toLowerCase().includes("rented")
            ? "rented"
            : status.toLowerCase().includes("pending")
                ? "pending"
                : "available";

        row.innerHTML = `
            <td>
                <div class="prop-cell">
                    <div class="prop-placeholder" aria-hidden="true">EH</div>
                    <div>
                        <p class="prop-name"></p>
                        <p class="prop-loc"></p>
                    </div>
                </div>
            </td>
            <td></td>
            <td></td>
            <td><span class="status-badge ${statusClass}"></span></td>
            <td>Just now</td>
            <td>
                <div class="row-actions">
                    <a href="edit-property.html" class="edit">Edit</a>
                    <a href="property-details.html">View</a>
                    <button type="button" class="delete" data-delete-property>Delete</button>
                </div>
            </td>`;
        row.querySelector(".prop-name").textContent = property.title;
        row.querySelector(".prop-loc").textContent = `📍 ${property.city || ""}, ${property.state || ""}`;
        row.children[1].textContent = property.type || "Residential";
        row.children[2].textContent = formattedPrice;
        row.querySelector(".status-badge").textContent = status;
        const editLink = row.querySelector(".edit");
        const viewLink = row.querySelector(".row-actions a:not(.edit)");
        editLink.href = `edit-property.html?property=${encodeURIComponent(property.title)}`;
        viewLink.href = `property-details.html?property=${encodeURIComponent(property.title)}`;
        tbody.appendChild(row);
    });

    updatePropertySummary(tbody);

    document.querySelectorAll("[data-delete-property]").forEach((button) => {
        button.addEventListener("click", async () => {
            const name = propertyNameFromRow(button);
            if (!name || !await confirmAction(`Delete "${name}" from your listings?`)) return;
            button.closest("tr")?.remove();
            saveProperties(getProperties().filter((item) => item.title !== name));

            updatePropertySummary(tbody);
            showToast("Property deleted.");
        });
    });
}

function wireDetailsActions() {
    const schedule = document.querySelector("#scheduleVisit");
    const contact = document.querySelector("#contactOwner");

    if (schedule) {
        schedule.addEventListener("click", () => {
            const date = window.prompt("Choose a visit date (YYYY-MM-DD):");
            if (!date) return;
            const time = window.prompt("Choose a visit time (for example, 11:00 AM):");
            if (!time) return;
            showToast(`Visit request sent for ${date} at ${time}.`);
        });
    }

    if (contact) {
        contact.addEventListener("click", () => {
            window.location.href = "tel:+919876543210";
        });
    }

    document.querySelectorAll(".thumb-row img").forEach((thumb) => {
        thumb.addEventListener("click", () => {
            const mainPhoto = document.querySelector(".main-photo");
            if (mainPhoto) {
                mainPhoto.src = thumb.src;
                mainPhoto.alt = thumb.alt;
            }
        });
    });
}

wirePropertyForm();
wireDetailsActions();
wireMyProperties();
