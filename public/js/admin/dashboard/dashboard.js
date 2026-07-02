let salesChartInstance = null;

async function fetchChartData(filter) {
  try {
    const response = await fetch(`/admin/dashboard/chart?filter=${filter}`);
    const data = await response.json();
    renderChart(data.labels, data.revenueData);
  } catch (error) {
    console.error("Error fetching chart data:", error);
  }
}

function renderChart(labels, dataPoints) {
  const ctx = document.getElementById('salesChart').getContext('2d');
  
  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('admin-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: dataPoints,
        borderColor: '#0055ff',
        backgroundColor: 'rgba(0, 85, 255, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#0055ff',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: isDark ? 'rgba(23, 33, 54, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          titleColor: isDark ? '#94a3b8' : '#64748b',
          bodyColor: isDark ? '#fff' : '#1e293b',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: tickColor
          }
        },
        y: {
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: tickColor,
            callback: function(value) {
              return '₹' + (value / 1000) + 'k';
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Initial fetch
  const filterSelect = document.getElementById('chartFilter');
  if (filterSelect) {
    fetchChartData(filterSelect.value);

    // Fetch on change
    filterSelect.addEventListener('change', (e) => {
      fetchChartData(e.target.value);
    });
  }
});

window.addEventListener('pageshow', function (event) {
  if (event.persisted || (typeof window.performance != 'undefined' && window.performance.navigation.type === 2)) {
    window.location.reload();
  }
});
