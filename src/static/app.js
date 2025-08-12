document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Filter and search elements
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");
  const clearFiltersBtn = document.getElementById("clear-filters");
  
  let allActivities = {}; // Store all activities for filtering

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;

      // Clear activity select dropdown
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      displayActivities(activities);

      // Populate activity select dropdown
      Object.keys(activities).forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to display activities based on filters
  function displayActivities(activities) {
    // Clear loading message
    activitiesList.innerHTML = "";

    if (Object.keys(activities).length === 0) {
      activitiesList.innerHTML = "<p>No activities match your search criteria.</p>";
      return;
    }

    // Convert to array for sorting
    let activitiesArray = Object.entries(activities);

    // Apply sorting
    const sortBy = sortSelect.value;
    activitiesArray.sort((a, b) => {
      const [nameA, detailsA] = a;
      const [nameB, detailsB] = b;

      switch (sortBy) {
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "time":
          return detailsA.time_sort.localeCompare(detailsB.time_sort);
        case "spots":
          const spotsA = detailsA.max_participants - detailsA.participants.length;
          const spotsB = detailsB.max_participants - detailsB.participants.length;
          return spotsB - spotsA;
        case "name":
        default:
          return nameA.localeCompare(nameB);
      }
    });

    // Create activity cards
    activitiesArray.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      
      // Get category class for styling
      const categoryClass = details.category.toLowerCase();

      // Create participants HTML with delete icons
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>
          ${name}
          <span class="category-tag ${categoryClass}">${details.category}</span>
        </h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Function to filter activities
  function filterActivities() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filtered = Object.fromEntries(
      Object.entries(allActivities).filter(([name, details]) => {
        // Search filter
        const matchesSearch = !searchTerm || 
          name.toLowerCase().includes(searchTerm) ||
          details.description.toLowerCase().includes(searchTerm) ||
          details.schedule.toLowerCase().includes(searchTerm);

        // Category filter
        const matchesCategory = !selectedCategory || details.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
    );

    displayActivities(filtered);
  }

  // Function to clear all filters
  function clearFilters() {
    searchInput.value = "";
    categoryFilter.value = "";
    sortSelect.value = "name";
    displayActivities(allActivities);
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        await fetchActivities();
        // Reapply current filters
        filterActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        await fetchActivities();
        // Reapply current filters
        filterActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Add event listeners for filters
  searchInput.addEventListener("input", filterActivities);
  categoryFilter.addEventListener("change", filterActivities);
  sortSelect.addEventListener("change", filterActivities);
  clearFiltersBtn.addEventListener("click", clearFilters);

  // Initialize app
  fetchActivities();
});
