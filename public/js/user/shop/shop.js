document.addEventListener('DOMContentLoaded', function () {
    const sortSelect = document.getElementById('sortSelect');
    // const categoryCheckboxes = document.querySelectorAll('input[name="category"]'); // No longer needed
    // const processorCheckboxes = document.querySelectorAll('input[name="processor"]'); // No longer needed

    // Helper to get all checked values for a name
    function getCheckedValues(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
    }

    // Make updateFilters globally accessible
    window.updateFilters = function() {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;

        // 1. Get Sort Value
        if (sortSelect) {
            searchParams.set('sort', sortSelect.value);
        }

        // 2. Multi-select filters
        ['category', 'processor', 'ram'].forEach(filterName => {
            searchParams.delete(filterName); 
            const values = getCheckedValues(filterName);
            values.forEach(val => searchParams.append(filterName, val));
        });

        // 3. Get Selected Price
        const checkedPrice = document.querySelector('input[name="price"]:checked');
        const priceSlider = document.getElementById('priceRangeSlider');

        if (checkedPrice) {
            searchParams.set('price', checkedPrice.value);
            searchParams.delete('maxPrice');
        } else if (priceSlider && priceSlider.value !== '5000') {
            searchParams.set('maxPrice', priceSlider.value);
            searchParams.delete('price');
        } else {
            searchParams.delete('price');
            searchParams.delete('maxPrice');
        }

        // 4. In-Page Search
        const shopSearch = document.getElementById('shopSearchInput');
        if (shopSearch) {
            const searchValue = shopSearch.value.trim();
            if (searchValue) {
                searchParams.set('search', searchValue);
            } else {
                searchParams.delete('search');
            }
        }

        // Reset to page 1 on every filter change
        searchParams.set('page', 1);

        // Update URL and refresh
        window.location.search = searchParams.toString();
    }

    window.toggleProcessorGroup = function (id) {
        const sub = document.getElementById(id);
        const icon = document.getElementById(id + '-icon');
        if (!sub || !icon) return;

        const isHidden = sub.classList.contains('hidden');

        // Toggle the sub-menu
        sub.classList.toggle('hidden');

        // Rotate the icon
        if (isHidden) {
            icon.classList.add('rotate-180');
        } else {
            icon.classList.remove('rotate-180');
        }
    };

    // Initial event listeners
    const shopSearch = document.getElementById('shopSearchInput');
    if (shopSearch) {
        shopSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.updateFilters();
            }
        });
    }

    // Attach to all relevant inputs
    document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
        if (input.name !== 'search') { 
            input.addEventListener('change', window.updateFilters);
        }
    });

    // Price Range Slider Logic
    const priceSlider = document.getElementById('priceRangeSlider');
    const priceValue = document.getElementById('priceRangeValue');

    if (priceSlider && priceValue) {
        priceSlider.addEventListener('input', (e) => {
            priceValue.textContent = `₹${e.target.value}`;
        });

        priceSlider.addEventListener('change', () => {
            // Deselect radio buttons if slider is moved
            const checkedPrice = document.querySelector('input[name="price"]:checked');
            if (checkedPrice) {
                checkedPrice.checked = false;
            }
            window.updateFilters();
        });
    }

    // Radio buttons reset slider when clicked
    document.querySelectorAll('input[name="price"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked && priceSlider) {
                priceSlider.value = 5000;
                priceValue.textContent = '₹5000';
            }
        });
    });

    // Custom Sort Dropdown Logic
    window.applySort = function(value) {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        searchParams.set('sort', value);
        searchParams.set('page', 1);
        window.location.search = searchParams.toString();
    };

    const sortDropdownBtn = document.getElementById('sortDropdownBtn');
    const sortDropdownMenu = document.getElementById('sortDropdownMenu');
    
    if (sortDropdownBtn && sortDropdownMenu) {
        sortDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = sortDropdownMenu.classList.contains('hidden');
            
            if (isHidden) {
                // Show
                sortDropdownMenu.classList.remove('hidden');
                setTimeout(() => {
                    sortDropdownMenu.classList.remove('opacity-0', 'translate-y-2');
                }, 10);
                sortDropdownBtn.querySelector('.material-symbols-outlined').classList.add('rotate-180');
            } else {
                // Hide
                sortDropdownMenu.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => {
                    sortDropdownMenu.classList.add('hidden');
                }, 300);
                sortDropdownBtn.querySelector('.material-symbols-outlined').classList.remove('rotate-180');
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!sortDropdownBtn.contains(e.target) && !sortDropdownMenu.contains(e.target)) {
                sortDropdownMenu.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => {
                    sortDropdownMenu.classList.add('hidden');
                }, 300);
                sortDropdownBtn.querySelector('.material-symbols-outlined').classList.remove('rotate-180');
            }
        });
    }

    // Fix for the "Apply All Filters" button if it exists
    const applyButton = document.querySelector('button.bg-primary');
    if (applyButton && applyButton.textContent.trim().toLowerCase().includes('apply all')) {
        applyButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.updateFilters();
        });
    }
});
