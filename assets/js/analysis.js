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
    
    // İsmi temizle
    const cleanedName = author.trim();
    
    // Virgülle ayrılmış format ise (Soyad, İsim)
    if (cleanedName.includes(',')) {
        const parts = cleanedName.split(',');
        if (parts.length >= 2) {
            // Soyisim ve ismi al
            const lastName = parts[0].trim();
            const firstName = parts[1].trim();
            
            // İsim soyisim formatında birleştir
            return `${firstName} ${lastName}`;
        }
    }
    
    // Eğer virgülle ayrılmış format değilse veya işlenemezse olduğu gibi döndür
    return cleanedName;
}

function createAuthorChart(data) {
    // Kişilerin tüm rollerini tek bir objede birleştir
    const allContributors = {};
    
    // Sadece kitap türündeki yayınları filtrele
    const bookData = data.filter(d => (d['Item Type'] || d.type)?.toLowerCase() === 'book');
    
    bookData.forEach(d => {
        // Yazarları işle
        if (d.Author) {
            d.Author.split(';').forEach(author => {
                if (author && author.trim()) {
                    const formattedName = formatAuthorName(author);
                    if (!allContributors[formattedName]) {
                        allContributors[formattedName] = { author: 0, editor: 0, translator: 0, total: 0 };
                    }
                    allContributors[formattedName].author++;
                    allContributors[formattedName].total++;
                }
            });
        }
        
        // Editörleri işle
        if (d.Editor) {
            d.Editor.split(';').forEach(editor => {
                if (editor && editor.trim()) {
                    const formattedName = formatAuthorName(editor);
                    if (!allContributors[formattedName]) {
                        allContributors[formattedName] = { author: 0, editor: 0, translator: 0, total: 0 };
                    }
                    allContributors[formattedName].editor++;
                    allContributors[formattedName].total++;
                }
            });
        }
        
        // Çevirmenleri işle
        if (d.Translator) {
            d.Translator.split(';').forEach(translator => {
                if (translator && translator.trim()) {
                    const formattedName = formatAuthorName(translator);
                    if (!allContributors[formattedName]) {
                        allContributors[formattedName] = { author: 0, editor: 0, translator: 0, total: 0 };
                    }
                    allContributors[formattedName].translator++;
                    allContributors[formattedName].total++;
                }
            });
        }
    });

    // Toplam katkı sayısına göre sırala ve en üst 25 kişiyi al
    const topContributors = Object.entries(allContributors)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 25);
    
    // Başlığı güncelle
    const chartContainer = document.querySelector('.chart-container:has(#authorChart) .chart-title');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <i class="fas fa-users me-2"></i>
            Basılı Yayın Kategorisinde En Aktif Katkıda Bulunanlar
        `;
    }

    // Veri seti hazırla
    const labels = topContributors.map(item => item[0]);
    const authorData = topContributors.map(item => item[1].author);
    const editorData = topContributors.map(item => item[1].editor);
    const translatorData = topContributors.map(item => item[1].translator);

    return new Chart(document.getElementById('authorChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Yazar',
                    data: authorData,
                    backgroundColor: CHART_COLORS.primary
                },
                {
                    label: 'Editör',
                    data: editorData,
                    backgroundColor: CHART_COLORS.secondary
                },
                {
                    label: 'Çevirmen',
                    data: translatorData,
                    backgroundColor: CHART_COLORS.tertiary
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        // Tooltip içeriğini özelleştir
                        title: function(context) {
                            return context[0].label; // Kişi adı
                        },
                        label: function(context) {
                            const labels = {
                                0: 'Yazar olarak',
                                1: 'Editör olarak',
                                2: 'Çevirmen olarak'
                            };
                            
                            if (context.raw === 0) {
                                return null; // Sıfır değerleri gösterme
                            }
                            
                            return `${labels[context.datasetIndex]}: ${context.raw} kitap`;
                        },
                        footer: function(context) {
                            // Toplam hesapla
                            const person = context[0].label;
                            const contributor = allContributors[person];
                            return `Toplam Katkı: ${contributor.total} kitap`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        callback: function(value) {
                            const label = this.getLabelForValue(value);
                            // Uzun isimleri kısalt
                            if (label.length > 15) {
                                return label.substr(0, 13) + '...';
                            }
                            return label;
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
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
        
        // Yeni eklenen grafik - En Çok Üretim Yapan 25 Yazar
        createTopProductiveAuthorsChart(filteredData);
    }).catch(function(error) {
        console.error('Veri yüklenirken hata oluştu:', error);
        alert('Veriler yüklenirken bir hata oluştu. Lütfen konsolu kontrol edin.');
    });
}

// En çok üretim yapan 25 yazarı gösteren grafik
function createTopProductiveAuthorsChart(data) {
    console.log('En çok üretim yapan yazarlar grafiği oluşturuluyor...');
    
    try {
        // Veri kontrolü
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error('Geçerli veri bulunamadı');
            return;
        }
        
        // Yayın türleri ve etiketleri
        const typeLabels = {
            'book': 'Kitap',
            'thesis': 'Tez',
            'journal article': 'Makale',
            'conference paper': 'Bildiri',
            'encyclopedia article': 'Ansiklopedi Maddesi',
            'book chapter': 'Kitap Bölümü',
            // Zotero formatları
            'booksection': 'Kitap Bölümü',
            'bookSection': 'Kitap Bölümü',
            'journalarticle': 'Makale',
            'journalArticle': 'Makale',
            'conferencepaper': 'Bildiri',
            'conferencePaper': 'Bildiri',
            // Alternatif eşleşmeler
            'makale': 'Makale',
            'bildiri': 'Bildiri',
            'tez': 'Tez',
            'kitap': 'Kitap',
            'kitap bölümü': 'Kitap Bölümü',
            'ansiklopedi maddesi': 'Ansiklopedi Maddesi'
        };
        
        // Kategori renkleri
        const categoryColors = {
            'Kitap': CHART_COLORS.primary,
            'Tez': CHART_COLORS.secondary,
            'Makale': CHART_COLORS.tertiary,
            'Bildiri': CHART_COLORS.quaternary,
            'Ansiklopedi Maddesi': CHART_COLORS.quinary,
            'Kitap Bölümü': CHART_COLORS.colors[5]
        };
        
        // Hedef kategoriler
        const targetCategories = [
            'Kitap', 'Tez', 'Makale', 'Bildiri', 'Ansiklopedi Maddesi', 'Kitap Bölümü'
        ];
        
        // Yazarların katkılarını takip etmek için bir nesne
        const authorContributions = {};
        
        // Veriyi işle
        let categoryStats = {
            'Kitap': 0,
            'Tez': 0,
            'Makale': 0,
            'Bildiri': 0,
            'Ansiklopedi Maddesi': 0,
            'Kitap Bölümü': 0,
            'Tanımlanamayan': 0
        };
        
        // İlk birkaç veriyi logla
        console.log('İlk 5 verinin formatı:');
        data.slice(0, 5).forEach((d, i) => {
            console.log(`Veri ${i+1}:`, {
                itemType: d['Item Type'] || d.type,
                archiveLocation: d['Archive Location'],
                title: d.Title
            });
        });
        
        // Kitap bölümü olanları logla
        console.log('Kitap Bölümü olarak tespit edilen ilk kayıt:');
        const bookSectionSample = data.find(d => 
            (d['Item Type'] || d.type || '').toLowerCase() === 'booksection' || 
            (d['Archive Location'] || '').includes('Kitap Bölümü')
        );
        console.log(bookSectionSample ? {
            itemType: bookSectionSample['Item Type'] || bookSectionSample.type,
            archiveLocation: bookSectionSample['Archive Location'],
            title: bookSectionSample.Title
        } : 'Kitap Bölümü kaydı bulunamadı');
        
        data.forEach(d => {
            // İtem tipini al ve küçük harfe çevir
            const rawItemType = (d['Item Type'] || d.type || '').toLowerCase();
            // Archive Location bilgisini al
            const archiveLocation = (d['Archive Location'] || '').toLowerCase();
            
            // Yayın türünü belirle (Önce Item Type'a bakılır)
            let category = typeLabels[rawItemType];
            
            // Eğer doğrudan eşleşme yoksa, archive location'a bak
            if (!category && archiveLocation) {
                // Doğrudan eşleşme kontrolü
                if (typeLabels[archiveLocation]) {
                    category = typeLabels[archiveLocation];
                } else {
                    // Kısmi eşleşme kontrolü
                    for (const [key, value] of Object.entries(typeLabels)) {
                        if (archiveLocation.includes(key.toLowerCase())) {
                            category = value;
                            break;
                        }
                    }
                }
            }
                
            // Hala bulunamadıysa, içeriğe göre tahmini eşleştirme yap
            if (!category) {
                // Özel durumlar - bookSection için ekstra kontrol
                if (rawItemType === 'booksection' || rawItemType === 'bookSection' || 
                    archiveLocation.includes('kitap bölümü')) {
                    category = 'Kitap Bölümü';
                }
                // Tez kategorisi için kontrol
                else if (rawItemType.includes('thesis') || archiveLocation.includes('tez')) {
                    category = 'Tez';
                }
                // Kitap kategorisi için kontrol
                else if (rawItemType.includes('book') && !rawItemType.includes('section') && 
                       !archiveLocation.includes('bölüm')) {
                    category = 'Kitap';
                }
                // Makale kategorisi için kontrol
                else if (rawItemType.includes('article') && !rawItemType.includes('encyclopedia') && 
                       !archiveLocation.includes('ansiklopedi')) {
                    category = 'Makale';
                }
                // Bildiri kategorisi için kontrol
                else if (rawItemType.includes('paper') || rawItemType.includes('conference') || 
                       archiveLocation.includes('bildiri')) {
                    category = 'Bildiri';
                }
                // Ansiklopedi maddesi kategorisi için kontrol
                else if ((rawItemType.includes('encyclopedia') || archiveLocation.includes('ansiklopedi')) && 
                       (rawItemType.includes('article') || archiveLocation.includes('madde'))) {
                    category = 'Ansiklopedi Maddesi';
                }
                // Son kontrol - bölüm kelimesi varsa Kitap Bölümüdür
                else if (rawItemType.includes('section') || archiveLocation.includes('bölüm')) {
                    category = 'Kitap Bölümü';
                }
            }
            
            // Kategori istatistiğini güncelle
            if (category && targetCategories.includes(category)) {
                categoryStats[category]++;
            } else {
                categoryStats['Tanımlanamayan']++;
            }
            
            // Hedeflenen kategorilerden biriyse işle
            if (category && targetCategories.includes(category)) {
                // Yazarları işleme
                if (d.Author) {
                    d.Author.split(';').forEach(author => {
                        if (author && author.trim()) {
                            const formattedName = formatAuthorName(author);
                            
                            // Yazar katkılarını takip et
                            if (!authorContributions[formattedName]) {
                                authorContributions[formattedName] = {
                                    total: 0
                                };
                                
                                // Her kategori için 0 değeri başlangıçta ata
                                targetCategories.forEach(cat => {
                                    authorContributions[formattedName][cat] = 0;
                                });
                            }
                            
                            // Kategoriye göre katkı sayısını artır
                            authorContributions[formattedName][category]++;
                            authorContributions[formattedName].total++;
                        }
                    });
                }
            }
        });
        
        // Kategori istatistiklerini logla
        console.log('Kategori İstatistikleri:', categoryStats);
        
        // Eğer hiç veri toplanmadıysa uyarı ver
        if (Object.keys(authorContributions).length === 0) {
            console.warn('Hiç yazar katkısı bulunamadı, veri yapısını kontrol edin.');
            return;
        }
        
        console.log('Toplam yazar sayısı:', Object.keys(authorContributions).length);
        
        // Toplam katkı sayısına göre sırala ve en üst 25 yazarı al
        const topAuthors = Object.entries(authorContributions)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 35);
        
        // Grafik veri setini hazırla
        const labels = topAuthors.map(author => author[0]);
        const datasets = targetCategories.map((category, index) => {
            return {
                label: category,
                data: topAuthors.map(author => author[1][category] || 0),
                backgroundColor: categoryColors[category] || CHART_COLORS.colors[index % CHART_COLORS.colors.length]
            };
        });
        
        // Canvas elementini kontrol et
        const canvas = document.getElementById('topProductiveAuthorsChart');
        if (!canvas) {
            console.error('topProductiveAuthorsChart ID\'li canvas elementi bulunamadı');
            return;
        }
        
        // Grafiği oluştur
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label; // Yazar adı
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.raw;
                                
                                if (value === 0) {
                                    return null; // Sıfır değerleri gösterme
                                }
                                
                                return `${label}: ${value} adet`;
                            },
                            footer: function(context) {
                                const author = context[0].label;
                                const contribution = authorContributions[author];
                                return `Toplam: ${contribution.total} yayın`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            callback: function(value) {
                                const label = this.getLabelForValue(value);
                                // Uzun isimleri kısalt
                                if (label.length > 15) {
                                    return label.substr(0, 12) + '...';
                                }
                                return label;
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
        console.log('Yazar katkıları grafiği başarıyla oluşturuldu.');
    } catch (error) {
        console.error('Grafik oluşturulurken hata oluştu:', error);
    }
}

// Sayfa yüklendiğinde grafikleri başlat
document.addEventListener('DOMContentLoaded', initializeCharts); 