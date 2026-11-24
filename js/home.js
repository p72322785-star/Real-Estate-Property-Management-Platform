
// Homepage Category Filtering and Property Details Popup

const categoryCards = document.querySelectorAll(".category-card");
const propertyCards = document.querySelectorAll(".property-card");
const filterMessage = document.getElementById("propertyFilterMessage");
const showAllButton = document.getElementById("showAllProperties");

// Category filtering
function filterProperties(category, selectedCard) {
    let visibleCount = 0;

    propertyCards.forEach(property => {
        if (property.dataset.category === category) {
            property.style.display = "block";
            visibleCount++;
        } else {
            property.style.display = "none";
        }
    });

    categoryCards.forEach(card => {
        const isSelected = card === selectedCard;
        card.classList.toggle("active-category", isSelected);
        card.setAttribute("aria-pressed", isSelected);
    });

    if (filterMessage) {
        filterMessage.textContent = visibleCount === 0
            ? "No properties available in this category yet."
            : `${visibleCount} ${visibleCount === 1 ? "property" : "properties"} found.`;
    }

    document.getElementById("properties").scrollIntoView({
        behavior: "smooth"
    });
}

// Category click and keyboard events
categoryCards.forEach(card => {
    card.addEventListener("click", () => {
        filterProperties(card.dataset.filter, card);
    });

    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            filterProperties(card.dataset.filter, card);
        }
    });
});

// Show all properties
if (showAllButton) {
    showAllButton.addEventListener("click", () => {
        propertyCards.forEach(property => {
            property.style.display = "block";
        });

        categoryCards.forEach(card => {
            card.classList.remove("active-category");
            card.setAttribute("aria-pressed", "false");
        });

        if (filterMessage) {
            filterMessage.textContent = "Showing all featured properties.";
        }

        document.getElementById("properties").scrollIntoView({
            behavior: "smooth"
        });
    });
}

// Property Details Popup
document.querySelectorAll(".view-property-btn").forEach(button => {
    button.addEventListener("click", event => {
        event.preventDefault();

        alert(
            "Property Details\n\n" +
            button.dataset.title + "\n" +
            "Location: " + button.dataset.location + "\n" +
            "Price: " + button.dataset.price + "\n" +
            "Details: " + button.dataset.details
        );
    });
});

// Property Details Modal

const propertyModal = document.getElementById("propertyModal");
const closeModal = document.getElementById("closeModal");

const modalTitle = document.getElementById("modalTitle");
const modalLocation = document.getElementById("modalLocation");
const modalPrice = document.getElementById("modalPrice");
const modalDetails = document.getElementById("modalDetails");

document.querySelectorAll(".view-property-btn").forEach(button => {
    button.addEventListener("click", event => {
        event.preventDefault();

        modalTitle.textContent = button.dataset.title;
        modalLocation.textContent = "📍 " + button.dataset.location;
        modalPrice.textContent = button.dataset.price;
        modalDetails.textContent = button.dataset.details;

        propertyModal.classList.add("show");
    });
});

if (closeModal) {
    closeModal.addEventListener("click", () => {
        propertyModal.classList.remove("show");
    });
}

if (propertyModal) {
    propertyModal.addEventListener("click", event => {
        if (event.target === propertyModal) {
            propertyModal.classList.remove("show");
        }
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && propertyModal) {
        propertyModal.classList.remove("show");
    }
});
