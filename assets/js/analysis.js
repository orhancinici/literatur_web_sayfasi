// Grafik renklerini tanımla
const CHART_COLORS = {
    primary: '#36A2EB',
    secondary: '#FF6384',
    tertiary: '#FFCE56',
    quaternary: '#4BC0C0',
    quinary: '#9966FF',
    // Ek renkler
    colors: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#B366FF', '#4BC0C0',
        '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'
    ]
};

let yearlyChart = null; // Global değişken olarak tanımla

// Arşiv türü seçeneklerini doldur
function populateArchiveFilter(data) {
    const archiveSelect = document.getElementById('archiveFilter');
    const archiveTypes = new Set();
    
    // Arşiv türlerini topla
    data.forEach(d => {
        if (d['Archive Location'] && d['Archive Location'].trim()) {
            archiveTypes.add(d['Archive Location'].trim());
        }
    });

    // Seçenekleri ekle
    archiveTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        archiveSelect.appendChild(option);
    });

    // Filtre değiştiğinde grafiği güncelle
    archiveSelect.addEventListener('change', () => {
        updateYearlyChart(data);
    });
}

// Yıllara göre veriyi hazırla
function prepareYearlyData(data, selectedArchive = 'all') {
    const yearlyData = {};
    const archiveData = {};

    data.forEach(d => {
        const year = d['Publication Year'];
        const archive = d['Archive Location'] || 'Diğer';
        
        if (year) {
            if (!yearlyData[year]) {
                yearlyData[year] = {};
            }
            if (!yearlyData[year][archive]) {
                yearlyData[year][archive] = 0;
            }
            yearlyData[year][archive]++;
        }
    });

    const years = Object.keys(yearlyData).sort();
    const archives = [...new Set(data.map(d => d['Archive Location'] || 'Diğer'))];
    
    const datasets = [];
    
    if (selectedArchive === 'all') {
        archives.forEach((archive, index) => {
            datasets.push({
                label: archive,
                data: years.map(year => yearlyData[year][archive] || 0),
                borderColor: CHART_COLORS.colors[index % CHART_COLORS.colors.length],
                backgroundColor: `${CHART_COLORS.colors[index % CHART_COLORS.colors.length]}33`,
                fill: true,
                tension: 0.4
            });
        });
    } else {
        datasets.push({
            label: selectedArchive,
            data: years.map(year => yearlyData[year][selectedArchive] || 0),
            borderColor: CHART_COLORS.primary,
            backgroundColor: `${CHART_COLORS.primary}33`,
            fill: true,
            tension: 0.4
        });
    }

    return {
        labels: years,
        datasets: datasets
    };
}

// Yıllık grafiği güncelle
function updateYearlyChart(data) {
    const selectedArchive = document.getElementById('archiveFilter').value;
    const chartData = prepareYearlyData(data, selectedArchive);

    if (yearlyChart) {
        yearlyChart.destroy();
    }

    yearlyChart = new Chart(document.getElementById('yearlyPublicationChart'), {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
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

// Sayaç animasyonu
function animateCounter(element, targetValue) {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentValue = 0;
    const increment = targetValue / steps;

    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            element.textContent = Math.round(targetValue);
            clearInterval(timer);
        } else {
            element.textContent = Math.round(currentValue);
        }
    }, stepDuration);
}

// Özet istatistikleri güncelle
function updateSummaryStats(data) {
    try {
        console.log('Veri örneği:', data[0]); // Veri yapısını kontrol et

        // Toplam yayın sayısı
        const totalPublications = data.length;
        animateCounter(document.querySelector('.total-publications'), totalPublications);

        // Farklı dil sayısı
        const uniqueLanguages = new Set();
        data.forEach(d => {
            if (d.Language && d.Language.trim()) {
                uniqueLanguages.add(d.Language.trim());
            }
        });
        animateCounter(document.querySelector('.total-languages'), uniqueLanguages.size);

        // Toplam yazar/editör sayısı
        const authors = new Set();
        data.forEach(d => {
            if (d.Author) {
                d.Author.split(';').forEach(author => {
                    if (author.trim()) authors.add(author.trim());
                });
            }
            if (d.Editor) {
                d.Editor.split(';').forEach(editor => {
                    if (editor.trim()) authors.add(editor.trim());
                });
            }
        });
        animateCounter(document.querySelector('.total-authors'), authors.size);

        // Farklı yayınevi sayısı
        const uniquePublishers = new Set();
        data.forEach(d => {
            if (d.Publisher && d.Publisher.trim()) {
                uniquePublishers.add(d.Publisher.trim());
            }
        });
        animateCounter(document.querySelector('.total-publishers'), uniquePublishers.size);

        console.log('İstatistikler:', {
            totalPublications,
            languages: uniqueLanguages.size,
            authors: authors.size,
            publishers: uniquePublishers.size
        });
    } catch (error) {
        console.error('İstatistikler güncellenirken hata:', error);
    }
}

// Grafik oluşturma fonksiyonları
function createPublicationTypeChart(data) {
    const publicationTypes = {};
    data.forEach(d => {
        const type = d['Archive Location'] || d.type; // Her iki format için kontrol
        if (type) {
            publicationTypes[type] = (publicationTypes[type] || 0) + 1;
        }
    });
    
    return new Chart(document.getElementById('publicationTypeChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(publicationTypes),
            datasets: [{
                data: Object.values(publicationTypes),
                backgroundColor: Object.values(CHART_COLORS)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Yayın Türleri Dağılımı'
                }
            }
        }
    });
}

function createLanguageChart(data) {
    const languages = {};
    data.forEach(d => {
        const lang = d.Language || d.language;
        if (lang) {
            languages[lang] = (languages[lang] || 0) + 1;
        }
    });

    return new Chart(document.getElementById('languageChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(languages),
            datasets: [{
                data: Object.values(languages),
                backgroundColor: Object.values(CHART_COLORS)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createPublisherChart(data) {
    const publishers = {};
    data.forEach(d => {
        const publisher = d.Publisher || d.publisher;
        if (publisher) {
            publishers[publisher] = (publishers[publisher] || 0) + 1;
        }
    });

    const topPublishers = Object.entries(publishers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);

    return new Chart(document.getElementById('publisherChart'), {
        type: 'bar',
        data: {
            labels: topPublishers.map(p => p[0]),
            datasets: [{
                label: 'Yayın Sayısı',
                data: topPublishers.map(p => p[1]),
                backgroundColor: CHART_COLORS.primary
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function formatAuthorName(author) {
    // Boş veya geçersiz değerleri kontrol et
    if (!author || typeof author !== 'string') return '';
    
    // İsmi temizle ve virgülle ayır
    const parts = author.trim().split(',');
    if (parts.length !== 2) return author.trim(); // Eğer virgülle ayrılmış format değilse olduğu gibi döndür
    
    // Soyisim ve ismi al
    const lastName = parts[0].trim();
    const firstName = parts[1].trim();
    
    // İsim soyisim formatında birleştir
    return `${firstName} ${lastName}`;
}

function createAuthorChart(data) {
    const authors = {};
    
    // Sadece kitap türündeki yayınları filtrele
    const bookData = data.filter(d => (d['Item Type'] || d.type)?.toLowerCase() === 'book');
    
    bookData.forEach(d => {
        // Sadece Author alanını kullan
        if (d.Author) {
            d.Author.split(';').forEach(author => {
                if (author && author.trim()) {
                    const formattedName = formatAuthorName(author);
                    authors[formattedName] = (authors[formattedName] || 0) + 1;
                }
            });
        }
    });

    const topAuthors = Object.entries(authors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    // Başlığı güncelle
    const chartContainer = document.querySelector('.chart-container:has(#authorChart) .chart-title');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <i class="fas fa-users me-2"></i>
            En Aktif Kitap Yazarları
        `;
    }

    return new Chart(document.getElementById('authorChart'), {
        type: 'bar',
        data: {
            labels: topAuthors.map(a => a[0]),
            datasets: [{
                label: 'Kitap Sayısı',
                data: topAuthors.map(a => a[1]),
                backgroundColor: CHART_COLORS.quaternary
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Kitap Sayısı: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        callback: function(value) {
                            const label = this.getLabelForValue(value);
                            // Uzun isimleri kısalt
                            if (label.length > 20) {
                                return label.substr(0, 18) + '...';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Ana fonksiyon - Tüm grafikleri oluştur
function initializeCharts() {
    console.log('Grafikleri yükleme başladı');
    d3.csv('assets/data/literatur.csv').then(function(data) {
        console.log('CSV verisi yüklendi:', data.length, 'kayıt');
        
        // Başlık satırını ve boş satırları filtrele
        const filteredData = data.filter(d => {
            return d['Item Type'] || d.type;
        });
        
        console.log('Filtrelenmiş veri:', filteredData.length, 'kayıt');

        // Arşiv filtresi seçeneklerini doldur
        populateArchiveFilter(filteredData);

        // Özet istatistikleri güncelle
        updateSummaryStats(filteredData);

        // Grafikleri oluştur
        updateYearlyChart(filteredData); // createYearlyPublicationChart yerine
        createPublicationTypeChart(filteredData);
        createLanguageChart(filteredData);
        createPublisherChart(filteredData);
        createAuthorChart(filteredData);
    }).catch(function(error) {
        console.error('Veri yüklenirken hata oluştu:', error);
        alert('Veriler yüklenirken bir hata oluştu. Lütfen konsolu kontrol edin.');
    });
}

// Sayfa yüklendiğinde grafikleri başlat
document.addEventListener('DOMContentLoaded', initializeCharts); 