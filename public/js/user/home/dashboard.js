window.addEventListener('pageshow', function (event) {
    if (event.persisted || (typeof window.performance != 'undefined' && window.performance.navigation.type === 2)) {
        window.location.reload();
    }
});
