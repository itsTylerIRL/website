/* Page scripts for rocketry.html (extracted from inline <script> blocks, in original order) */
(function() {
    const d = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    document.getElementById('doc-date').textContent = 'DATE: ' + String(d.getDate()).padStart(2,'0') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
})();

(function() {
    const d = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    document.getElementById('doc-date-2').textContent = 'DATE: ' + String(d.getDate()).padStart(2,'0') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
})();

let currentRocket = 0;
const totalRockets = 2;

function switchRocket(direction) {
    const newIndex = currentRocket + direction;
    if (newIndex >= 0 && newIndex < totalRockets) {
        goToRocket(newIndex);
    }
}

function goToRocket(index) {
    currentRocket = index;
    
    // Update sections
    document.querySelectorAll('.rocket-section').forEach((section, i) => {
        section.classList.toggle('active', i === index);
    });
    
    // Update dots
    document.querySelectorAll('.rocket-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    // Update nav arrows
    document.querySelector('.rocket-nav.prev').classList.toggle('disabled', index === 0);
    document.querySelector('.rocket-nav.next').classList.toggle('disabled', index === totalRockets - 1);
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') switchRocket(-1);
    if (e.key === 'ArrowRight') switchRocket(1);
});
