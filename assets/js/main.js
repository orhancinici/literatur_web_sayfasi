// assets/js/main.js
let dataTable;

// Yayın türü çevirileri
const itemTypeTranslations = {
    'journalArticle': 'Makale',
    'book': 'Kitap',
    'bookSection': 'Kitap Bölümü',
    'thesis': 'Tez',
    'conferencePaper': 'Bildiri',
    'webpage': 'Web Sayfası',
    'document': 'Belge',
    'encyclopediaArticle':'Ansiklopedi Maddesi'
};

// İsim formatını düzenleme fonksiyonu
function formatAuthorName(authorStr) {
    if (!authorStr) return '';
    
    // Birden fazla yazar varsa ayır
    const authors = authorStr.split(';');
    
    // Her yazarı düzenle
    const formattedAuthors = authors.map(author => {
        author = author.trim();
        if (author.includes(',')) {
            // Soyadı, Ad formatındaysa düzelt
            const [lastName, firstName] = author.split(',').map(s => s.trim());
            return `${firstName} ${lastName}`;
        }
        return author;
    });
    
    // Yazarları birleştir
    return formattedAuthors.join('; ');
}

// İstatistikleri güncelleme fonksiyonu
function updateStats(data) {
    // Toplam çalışma sayısı
    const totalStudies = data.length;
    document.getElementById('totalStudies').textContent = totalStudies;

    // Makale sayısı
    const totalArticles = data.filter(item => item['Item Type'] === 'journalArticle').length;
    document.getElementById('totalArticles').textContent = totalArticles;

    // Kitap sayısı (kitap ve kitap bölümü)
    const totalBooks = data.filter(item => item['Item Type'] === 'book').length; 
    document.getElementById('totalBooks').textContent = totalBooks;

    // Tez sayısı
    const totalThesis = data.filter(item => item['Item Type'] === 'thesis').length;
    document.getElementById('totalThesis').textContent = totalThesis;
}

// Metni normalize etme fonksiyonu
function normalizeText(text) {
    if (!text) return '';
    return text.toString()
        .replace(/[i]/g, 'İ')
        .replace(/[ı]/g, 'I')
        .replace(/[İ]/g, 'i')
        .replace(/[I]/g, 'ı')
        .replace(/[îÎ]/g, 'i')
        .replace(/[âÂ]/g, 'a')
        .replace(/[ûÛ]/g, 'u')
        .replace(/[''`′'ʿ]/g, '')
        .replace(/[""″"]/g, '')
        .replace(/[\-:\/\(\)–\.\s…]/g, ' ')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

// CSV verilerini alma fonksiyonu
async function loadCSVData() {
    try {
        const response = await fetch('assets/data/literatur.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    // İstatistikleri güncelle
                    updateStats(results.data);
                    // DataTable'ı başlat
                    initializeDataTable(results.data);
                } else {
                    console.error("CSV verisi boş veya geçersiz");
                }
            },
            error: function(error) {
                console.error("CSV parse hatası:", error);
            }
        });
    } catch (error) {
        console.error("Veri yükleme hatası:", error);
    }
}

// DataTable yapılandırması
const dataTableConfig = {
    language: {
        url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/tr.json'
    },
    pageLength: 25,
    order: [[0, 'asc']],
    dom: 'Blfrtip',
    buttons: [
        {
            extend: 'collection',
            text: 'Dışa Aktar',
            buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
        }
    ],
    responsive: true,
    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Tümü"]]
};

// Filtreleme fonksiyonları
function setupFilters(data) {
    // Yılları doldur
    const years = [...new Set(data.map(item => item['Publication Year']))].filter(Boolean);
    const yearFilter = document.getElementById('yearFilter');
    years.sort((a, b) => b - a).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });

    // Türleri doldur
    const types = [...new Set(data.map(item => item['Item Type']))].filter(Boolean);
    const typeFilter = document.getElementById('typeFilter');
    types.sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = itemTypeTranslations[type] || type;
        typeFilter.appendChild(option);
    });

    // Tüm kişileri topla (yazarlar, editörler, çevirmenler)
    const allContributors = new Set();
    
    // Yazarları topla
    data.forEach(item => {
        if (item.Author) {
            item.Author.split(';').map(author => author.trim()).filter(Boolean).forEach(author => {
                allContributors.add(author);
            });
        }
        
        // Editörleri ekle
        if (item.Editor) {
            item.Editor.split(';').map(editor => editor.trim()).filter(Boolean).forEach(editor => {
                allContributors.add(editor);
            });
        }
        
        // Çevirmenleri ekle
        if (item.Translator) {
            item.Translator.split(';').map(translator => translator.trim()).filter(Boolean).forEach(translator => {
                allContributors.add(translator);
            });
        }
    });
    
    // Kişi filtresini doldur
    const authorFilter = document.getElementById('authorFilter');
    
    // Kişileri ad-soyad şeklinde görünen formata göre sırala
    const sortedContributors = Array.from(allContributors).sort((a, b) => {
        const formattedA = formatAuthorName(a).toLowerCase();
        const formattedB = formatAuthorName(b).toLowerCase();
        return formattedA.localeCompare(formattedB, 'tr');
    });
    
    sortedContributors.forEach(person => {
        const option = document.createElement('option');
        option.value = person;
        option.textContent = formatAuthorName(person);
        authorFilter.appendChild(option);
    });

    // DataTable custom filtering
    $.fn.dataTable.ext.search.push(function(settings, searchData, index, rowData, counter) {
        const year = yearFilter.value;
        const type = typeFilter.value;
        const person = authorFilter.value;

        const yearMatch = !year || rowData['Publication Year']?.toString() === year;
        const typeMatch = !type || rowData['Item Type'] === type;
        
        // Kişi filtrelemesi (yazar, editör veya çevirmen olarak bulunabilir)
        let personMatch = true;
        if (person) {
            personMatch = false;
            // Yazar olarak kontrol et
            if ((rowData['Author'] || '').includes(person)) {
                personMatch = true;
            }
            // Editör olarak kontrol et
            else if ((rowData['Editor'] || '').includes(person)) {
                personMatch = true;
            }
            // Çevirmen olarak kontrol et
            else if ((rowData['Translator'] || '').includes(person)) {
                personMatch = true;
            }
        }

        return yearMatch && typeMatch && personMatch;
    });

    // Filtre değişikliklerini dinle
    $('.form-select').on('change', function() {
        dataTable.draw();
        updateFilteredStats();
    });

    // Reset butonu
    $('#resetFilters').on('click', function() {
        yearFilter.value = '';
        typeFilter.value = '';
        authorFilter.value = '';
        dataTable.draw();
        updateFilteredStats();
    });
}

// DataTable başlatma fonksiyonunu güncelle
function initializeDataTable(data) {
    if ($.fn.DataTable.isDataTable('#dataTable')) {
        $('#dataTable').DataTable().destroy();
    }

    $('#dataTable').empty();

    dataTable = $('#dataTable').DataTable({
        ...dataTableConfig,
        data: data,
        columns: [
            { title: 'Başlık', data: 'Title' },
            { 
                title: 'Yazar', 
                data: 'Author',
                render: function(data, type, row) {
                    if (type === 'display') {
                        return formatAuthorName(data);
                    }
                    return data;
                }
            },
            { title: 'Yayın Yılı', data: 'Publication Year' },
            { 
                title: 'Yayın Türü', 
                data: 'Archive Location',
                render: function(data, type, row) {
                    return itemTypeTranslations[data] || data;
                }
            },
            { title: 'Dil', data: 'Language' }
        ],
        search: {
            smart: false
        },
        initComplete: function() {
            setupFilters(data);
        }
    });

    // Özel arama fonksiyonu
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex, rowData) {
        const searchValue = normalizeText($('#globalSearch').val());
        const searchCategory = $('.form-select').val();
        
        if (!searchValue) return true;

        // Arama değeri boşluklarla ayrılmış birden fazla kelime içeriyorsa
        const hasMultipleWords = searchValue.trim().includes(' ');
        const searchTerms = hasMultipleWords ? 
                            searchValue.split(' ').filter(term => term.trim() !== '') : 
                            [searchValue];

        // Tabloda görünmeyen ek alanları da aramaya dahil et (Editör gibi)
        const additionalFields = ['Editor', 'Translator', 'DOI', 'ISBN', 'ISSN'];
        const additionalData = additionalFields.map(field => normalizeText(rowData[field] || ''));

        // Seçili kategoriye göre arama
        if (searchCategory === 'Tüm Alanlarda') {
            // Tüm sütunlarda ara
            for (let i = 0; i < data.length; i++) {
                const cellData = normalizeText(data[i]);
                
                // Çok kelimeli arama için (tüm terimler bulunmalı)
                if (hasMultipleWords) {
                    let allTermsFound = true;
                    for (let term of searchTerms) {
                        if (!cellData.includes(term)) {
                            allTermsFound = false;
                            break;
                        }
                    }
                    if (allTermsFound) return true;
                } 
                // Tek kelimeli arama için
                else if (cellData.includes(searchValue)) {
                    return true;
                }
            }
            
            // Tabloda görünmeyen ek alanlarda da ara
            for (let i = 0; i < additionalData.length; i++) {
                const extraData = additionalData[i];
                if (!extraData) continue;
                
                // Çok kelimeli arama için (tüm terimler bulunmalı)
                if (hasMultipleWords) {
                    let allTermsFound = true;
                    for (let term of searchTerms) {
                        if (!extraData.includes(term)) {
                            allTermsFound = false;
                            break;
                        }
                    }
                    if (allTermsFound) return true;
                } 
                // Tek kelimeli arama için
                else if (extraData.includes(searchValue)) {
                    return true;
                }
            }
        } else {
            // Belirli kategorilerde arama için yayın türünü kontrol et
            const itemTypeMap = {
                'Makale': 'journalArticle',
                'Tez': 'thesis',
                'Bildiri': 'conferencePaper',
                'Kitap': 'book',
                'Ansiklopedi Maddesi': 'encyclopediaArticle',
                'Kitap Bölümü': 'bookSection'
            };
            
            // Seçilen kategori için yayın türü kontrolü
            const selectedItemType = itemTypeMap[searchCategory];
            if (!selectedItemType || rowData['Item Type'] !== selectedItemType) {
                return false; // Kategori eşleşmiyorsa gösterme
            }
            
            // Başlık alanında arama
            const titleData = normalizeText(data[0]); // 0. indeks başlık sütunu
            
            // Yazar alanında arama
            const authorData = normalizeText(data[1]); // 1. indeks yazar sütunu
            
            // Görünmeyen alanlarda da ara (editör, çevirmen, vb.)
            const searchFields = [titleData, authorData, ...additionalData];
            
            // Çok kelimeli arama için
            if (hasMultipleWords) {
                for (const fieldData of searchFields) {
                    if (!fieldData) continue;
                    
                    let allTermsFound = true;
                    for (let term of searchTerms) {
                        if (!fieldData.includes(term)) {
                            allTermsFound = false;
                            break;
                        }
                    }
                    if (allTermsFound) return true;
                }
                return false;
            } 
            // Tek kelimeli arama için
            else {
                for (const fieldData of searchFields) {
                    if (fieldData && fieldData.includes(searchValue)) {
                        return true;
                    }
                }
                return false;
            }
        }
        return false;
    });

    // Arama olaylarını dinle
    $('#globalSearch').on('keyup', function() {
        dataTable.draw();
        updateFilteredStats();
    });

    $('.form-select').on('change', function() {
        dataTable.draw();
        updateFilteredStats();
    });

    $('.btn-primary').on('click', function() {
        dataTable.draw();
        updateFilteredStats();
    });

    // Satıra tıklama
    $('#dataTable tbody').on('click', 'tr', function() {
        const rowData = dataTable.row(this).data();
        showBookDetail(rowData);
    });
}

// Filtrelenmiş verilerin istatistiklerini güncelleme
function updateFilteredStats() {
    const filteredData = dataTable.rows({search:'applied'}).data().toArray();
    updateStats(filteredData);
}

// Yayın türüne göre gösterilecek alanları tanımlama
const typeFields = {
    'journalArticle': {
        'Title': 'Başlık',
        'Author': 'Yazar',
        'Editor': 'Editör',
        'Translator' : "Çeviri",
        'Publication Year': 'Yayın Yılı',
        'Publisher': 'Yayınevi',
        'Publication Title': 'Dergi Adı',
        'Volume': 'Cilt',
        'Issue': 'Sayı',
        'Pages': 'Sayfalar',
        'DOI': 'DOI',
        'ISSN': 'ISSN',
        'Language': 'Dil',
        'Archive Location': 'Yayın Türü',        
        'Abstract Note': 'Özet'
    },
    'book': {
        'Title': 'Başlık',
        'Author': 'Yazar',
        'Editor': 'Editör',
        'Translator' : "Çeviri",
        'Publication Year': 'Yayın Yılı',
        'Publisher': 'Yayınevi',
        'ISBN': 'ISBN',
        'Place': 'Basım Yeri',
        'Edition': 'Baskı',
        'Number Of Volumes': 'Cilt Sayısı',
        'Num Pages': 'Sayfa Sayısı',
        'Language': 'Dil',
        'Archive Location': 'Yayın Türü',
        'Abstract Note': 'Özet'
    },
    'bookSection': {
        'Title': 'Kitap Bölümü Başlığı',
        'Author': 'Yazar',
        'Publication Title': 'Kitabın Adı',
        'Editor': 'Editör',
        'Translator' : "Çeviri",
        'Publication Year': 'Yayın Yılı',
        'Publisher': 'Yayınevi',
        'ISBN': 'ISBN',
        'Book Title': 'Kitap Adı',
        'Pages': 'Sayfalar',
        'Place': 'Basım Yeri',
        'Language': 'Dil',
        'Archive Location': 'Yayın Türü',
        'Abstract Note': 'Özet'
    },
    'thesis': {
        'Title': 'Başlık',
        'Author': 'Yazar',
        'Publication Year': 'Yayın Yılı',
        'Publisher': 'Üniversite',
        'Place': 'Şehir',
        'Num Pages': 'Sayfa Sayısı',
        'Thesis Type': 'Tez Türü',
        'Language': 'Dil',
        'Archive Location': 'Yayın Türü',
        'Abstract Note': 'Özet'
    }
};

// Mevcut veriyi saklamak için global değişken
let currentItemData = null;

// Modal fonksiyonu
function showBookDetail(rowData) {
    // Mevcut veriyi global değişkene ata
    currentItemData = rowData;
    
    const itemType = rowData['Item Type'] || 'journalArticle';
    const fields = typeFields[itemType] || typeFields['journalArticle'];
    
    document.getElementById('detailModalLabel').textContent = itemTypeTranslations[itemType] || itemType;
    
    const detailsContainer = document.querySelector('.book-details');
    detailsContainer.innerHTML = '';
    
    // URL'ye kayıt kimliğini ekle (Zotero'nun yeni içeriği algılaması için)
    if (rowData['Key']) {
        const newUrl = new URL(window.location.href);
        newUrl.hash = 'item-' + rowData['Key'];
        window.history.replaceState({}, '', newUrl.toString());
    }
    
    // Zotero meta etiketlerini güncelle
    updateZoteroMetaTags(rowData);
    
    Object.entries(fields).forEach(([key, label]) => {
        let value = rowData[key] || '';
        if (key === 'Author') {
            value = formatAuthorName(value);
        }
        if (value) {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${label}:</strong> <span>${value}</span>`;
            
            // Özet alanı için özel stil
            if (label === 'Özet') {
                p.querySelector('span').style.display = 'block';
                p.querySelector('span').style.marginTop = '0.5rem';
                p.querySelector('span').style.textAlign = 'justify';
                p.querySelector('span').style.lineHeight = '1.6';
            }
            
            detailsContainer.appendChild(p);
        }
    });

    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

// Zotero meta etiketlerini güncelleme fonksiyonu
function updateZoteroMetaTags(rowData) {
    // Mevcut meta etiketlerini temizle - sadece sabit site bilgilerini koru
    document.querySelectorAll('meta[name^="citation_"], meta[name^="DC."]').forEach(meta => {
        const name = meta.getAttribute('name');
        // Sabit site bilgilerini koru, diğerlerini temizle
        if (!['citation_title', 'citation_online_date', 'citation_public_url'].includes(name)) {
            meta.remove();
        }
    });
    
    // Mevcut COinS span'ını temizle
    document.querySelectorAll('span.Z3988').forEach(span => span.remove());
    
    const itemType = rowData['Item Type'] || 'journalArticle';
    
    // Temel meta etiketleri
    updateOrCreateMetaTag('citation_title', rowData['Title'] || '');
    
    // Yazar bilgisi
    if (rowData['Author']) {
        const authors = rowData['Author'].split(';');
        authors.forEach(author => {
            let formattedAuthor = author.trim();
            if (formattedAuthor.includes(',')) {
                const [lastName, firstName] = formattedAuthor.split(',').map(s => s.trim());
                formattedAuthor = `${firstName} ${lastName}`;
            }
            // Her yazar için yeni bir meta etiketi oluştur
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'citation_author');
            meta.setAttribute('content', formattedAuthor);
            document.head.appendChild(meta);
        });
    }
    
    // Yayın yılı
    if (rowData['Publication Year']) {
        updateOrCreateMetaTag('citation_date', rowData['Publication Year']);
        updateOrCreateMetaTag('citation_year', rowData['Publication Year']);
    }
    
    // Yayın türüne göre özel meta etiketleri
    switch(itemType) {
        case 'journalArticle':
            updateOrCreateMetaTag('citation_journal_title', rowData['Publication Title'] || '');
            updateOrCreateMetaTag('citation_volume', rowData['Volume'] || '');
            updateOrCreateMetaTag('citation_issue', rowData['Issue'] || '');
            updateOrCreateMetaTag('citation_pages', rowData['Pages'] || '');
            updateOrCreateMetaTag('citation_doi', rowData['DOI'] || '');
            updateOrCreateMetaTag('citation_issn', rowData['ISSN'] || '');
            updateOrCreateMetaTag('citation_publisher', rowData['Publisher'] || '');
            updateOrCreateMetaTag('DC.type', 'article');
            break;
            
        case 'book':
            updateOrCreateMetaTag('citation_publisher', rowData['Publisher'] || '');
            updateOrCreateMetaTag('citation_isbn', rowData['ISBN'] || '');
            updateOrCreateMetaTag('citation_publisher_place', rowData['Place'] || '');
            updateOrCreateMetaTag('DC.type', 'book');
            break;
            
        case 'bookSection':
            updateOrCreateMetaTag('citation_book_title', rowData['Publication Title'] || '');
            updateOrCreateMetaTag('citation_publisher', rowData['Publisher'] || '');
            updateOrCreateMetaTag('citation_isbn', rowData['ISBN'] || '');
            updateOrCreateMetaTag('citation_pages', rowData['Pages'] || '');
            updateOrCreateMetaTag('citation_publisher_place', rowData['Place'] || '');
            updateOrCreateMetaTag('DC.type', 'bookSection');
            break;
            
        case 'thesis':
            updateOrCreateMetaTag('citation_university', rowData['Publisher'] || '');
            updateOrCreateMetaTag('citation_dissertation_institution', rowData['Publisher'] || '');
            updateOrCreateMetaTag('citation_dissertation_name', rowData['Title'] || '');
            updateOrCreateMetaTag('DC.type', 'thesis');
            break;
    }
    
    // Dil bilgisi
    if (rowData['Language']) {
        updateOrCreateMetaTag('DC.language', rowData['Language']);
    } else {
        // Varsayılan dil
        updateOrCreateMetaTag('DC.language', 'tr');
    }
    
    // Yayın türü
    updateOrCreateMetaTag('DC.type', itemType);
    
    // Özet
    if (rowData['Abstract Note']) {
        updateOrCreateMetaTag('citation_abstract', rowData['Abstract Note']);
    }
    
    // Editör ve çevirmen
    if (rowData['Editor']) {
        const editors = rowData['Editor'].split(';');
        editors.forEach(editor => {
            let formattedEditor = editor.trim();
            if (formattedEditor.includes(',')) {
                const [lastName, firstName] = formattedEditor.split(',').map(s => s.trim());
                formattedEditor = `${firstName} ${lastName}`;
            }
            // Her editör için yeni bir meta etiketi oluştur
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'citation_editor');
            meta.setAttribute('content', formattedEditor);
            document.head.appendChild(meta);
        });
    }
    
    if (rowData['Translator']) {
        const translators = rowData['Translator'].split(';');
        translators.forEach(translator => {
            let formattedTranslator = translator.trim();
            if (formattedTranslator.includes(',')) {
                const [lastName, firstName] = formattedTranslator.split(',').map(s => s.trim());
                formattedTranslator = `${firstName} ${lastName}`;
            }
            // Her çevirmen için yeni bir meta etiketi oluştur
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'citation_translator');
            meta.setAttribute('content', formattedTranslator);
            document.head.appendChild(meta);
        });
    }
    
    // COinS formatını ekle
    addCOinSSpan(rowData);
}

// COinS formatını ekleme fonksiyonu
function addCOinSSpan(rowData) {
    const itemType = rowData['Item Type'] || 'journalArticle';
    
    // COinS parametrelerini hazırla
    const coinsParams = new Map();
    
    // Temel parametreler
    coinsParams.set('ctx_ver', 'Z39.88-2004');
    
    // Yayın türüne göre format
    switch(itemType) {
        case 'journalArticle':
            coinsParams.set('rft_val_fmt', 'info:ofi/fmt:kev:mtx:journal');
            coinsParams.set('rft.genre', 'article');
            coinsParams.set('rft.atitle', rowData['Title'] || '');
            coinsParams.set('rft.jtitle', rowData['Publication Title'] || '');
            coinsParams.set('rft.volume', rowData['Volume'] || '');
            coinsParams.set('rft.issue', rowData['Issue'] || '');
            coinsParams.set('rft.pages', rowData['Pages'] || '');
            coinsParams.set('rft.issn', rowData['ISSN'] || '');
            break;
            
        case 'book':
            coinsParams.set('rft_val_fmt', 'info:ofi/fmt:kev:mtx:book');
            coinsParams.set('rft.genre', 'book');
            coinsParams.set('rft.btitle', rowData['Title'] || '');
            coinsParams.set('rft.publisher', rowData['Publisher'] || '');
            coinsParams.set('rft.isbn', rowData['ISBN'] || '');
            coinsParams.set('rft.place', rowData['Place'] || '');
            break;
            
        case 'bookSection':
            coinsParams.set('rft_val_fmt', 'info:ofi/fmt:kev:mtx:book');
            coinsParams.set('rft.genre', 'bookitem');
            coinsParams.set('rft.atitle', rowData['Title'] || '');
            coinsParams.set('rft.btitle', rowData['Publication Title'] || '');
            coinsParams.set('rft.publisher', rowData['Publisher'] || '');
            coinsParams.set('rft.isbn', rowData['ISBN'] || '');
            coinsParams.set('rft.pages', rowData['Pages'] || '');
            break;
            
        case 'thesis':
            coinsParams.set('rft_val_fmt', 'info:ofi/fmt:kev:mtx:dissertation');
            coinsParams.set('rft.genre', 'dissertation');
            coinsParams.set('rft.title', rowData['Title'] || '');
            coinsParams.set('rft.inst', rowData['Publisher'] || '');
            break;
            
        default:
            coinsParams.set('rft_val_fmt', 'info:ofi/fmt:kev:mtx:dc');
            coinsParams.set('rft.title', rowData['Title'] || '');
    }
    
    // Ortak parametreler
    if (rowData['Author']) {
        const authors = rowData['Author'].split(';');
        // Birden fazla yazar için ayrı ayrı rft.au parametreleri oluştur
        authors.forEach((author, index) => {
            let formattedAuthor = author.trim();
            if (formattedAuthor.includes(',')) {
                // Zaten Soyadı, Ad formatındaysa kullan
                coinsParams.set(`rft.au${index > 0 ? '.' + index : ''}`, formattedAuthor);
            } else {
                // Ad Soyad formatını Soyadı, Ad formatına çevir
                const parts = formattedAuthor.split(' ');
                if (parts.length > 1) {
                    const lastName = parts.pop();
                    const firstName = parts.join(' ');
                    coinsParams.set(`rft.au${index > 0 ? '.' + index : ''}`, `${lastName}, ${firstName}`);
                } else {
                    coinsParams.set(`rft.au${index > 0 ? '.' + index : ''}`, formattedAuthor);
                }
            }
        });
    }
    
    // Editör bilgisi
    if (rowData['Editor']) {
        const editors = rowData['Editor'].split(';');
        // Birden fazla editör için ayrı ayrı rft.editor parametreleri oluştur
        editors.forEach((editor, index) => {
            let formattedEditor = editor.trim();
            if (formattedEditor.includes(',')) {
                // Zaten Soyadı, Ad formatındaysa kullan
                coinsParams.set(`rft.editor${index > 0 ? '.' + index : ''}`, formattedEditor);
            } else {
                // Ad Soyad formatını Soyadı, Ad formatına çevir
                const parts = formattedEditor.split(' ');
                if (parts.length > 1) {
                    const lastName = parts.pop();
                    const firstName = parts.join(' ');
                    coinsParams.set(`rft.editor${index > 0 ? '.' + index : ''}`, `${lastName}, ${firstName}`);
                } else {
                    coinsParams.set(`rft.editor${index > 0 ? '.' + index : ''}`, formattedEditor);
                }
            }
        });
    }
    
    // Çevirmen bilgisi
    if (rowData['Translator']) {
        const translators = rowData['Translator'].split(';');
        // Birden fazla çevirmen için ayrı ayrı rft.translator parametreleri oluştur
        translators.forEach((translator, index) => {
            let formattedTranslator = translator.trim();
            if (formattedTranslator.includes(',')) {
                // Zaten Soyadı, Ad formatındaysa kullan
                coinsParams.set(`rft.translator${index > 0 ? '.' + index : ''}`, formattedTranslator);
            } else {
                // Ad Soyad formatını Soyadı, Ad formatına çevir
                const parts = formattedTranslator.split(' ');
                if (parts.length > 1) {
                    const lastName = parts.pop();
                    const firstName = parts.join(' ');
                    coinsParams.set(`rft.translator${index > 0 ? '.' + index : ''}`, `${lastName}, ${firstName}`);
                } else {
                    coinsParams.set(`rft.translator${index > 0 ? '.' + index : ''}`, formattedTranslator);
                }
            }
        });
    }
    
    if (rowData['Publication Year']) {
        coinsParams.set('rft.date', rowData['Publication Year']);
    }
    
    if (rowData['Language']) {
        coinsParams.set('rft.language', rowData['Language']);
    }
    
    // COinS URL'sini oluştur
    let coinsUrl = '';
    coinsParams.forEach((value, key) => {
        if (value) {
            coinsUrl += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
    });
    
    if (coinsUrl.startsWith('&')) {
        coinsUrl = coinsUrl.substring(1);
    }
    
    // COinS span'ını oluştur ve sayfaya ekle
    const coinsSpan = document.createElement('span');
    coinsSpan.className = 'Z3988';
    coinsSpan.setAttribute('title', coinsUrl);
    coinsSpan.style.display = 'none';
    document.body.appendChild(coinsSpan);
}

// Meta etiketi güncelleme veya oluşturma fonksiyonu
function updateOrCreateMetaTag(name, content) {
    if (!content) return;
    
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) {
        meta.setAttribute('content', content);
    } else {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }
}

// Enter tuşu ile arama
$('#globalSearch').on('keypress', function(e) {
    if (e.which === 13) {
        dataTable.draw();
        updateFilteredStats();
    }
});

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    loadCSVData();
    
    // Filtre durumunu localStorage'da sakla
    const filtersCollapse = document.getElementById('filtersCollapse');
    const filterState = localStorage.getItem('filterState');
    
    if (filterState === 'show') {
        filtersCollapse.classList.add('show');
    }
    
    // Filtre durumu değiştiğinde localStorage'a kaydet
    filtersCollapse.addEventListener('shown.bs.collapse', function () {
        localStorage.setItem('filterState', 'show');
    });
    
    filtersCollapse.addEventListener('hidden.bs.collapse', function () {
        localStorage.setItem('filterState', 'hide');
    });
});

// Modal açılırken smooth scroll'u devre dışı bırak
$(document).on('show.bs.modal', '.modal', function() {
    document.body.style.overflow = 'hidden';
});

// Modal kapanırken scroll'u tekrar aktif et ve URL hash'ini temizle
$(document).on('hidden.bs.modal', '.modal', function() {
    document.body.style.overflow = 'auto';
    
    // URL hash'ini temizle
    if (window.location.hash && window.location.hash.startsWith('#item-')) {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }
});

// Zotero butonu tıklama olayı
$(document).on('click', '#zoteroButton', function() {
    // Zotero'nun sayfadaki meta etiketleri algılaması için kısa bir süre bekle
    setTimeout(() => {
        // Zotero'ya sayfanın değiştiğini bildirmek için URL'yi yeniden yükle
        if (window.location.hash) {
            // Mevcut hash'i al
            const currentHash = window.location.hash;
            
            // Hash'i geçici olarak kaldır
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
            
            // Kısa bir süre sonra hash'i geri ekle
            setTimeout(() => {
                window.history.replaceState({}, '', window.location.pathname + window.location.search + currentHash);
                
                // Kullanıcıya bilgi ver
                alert('Zotero eklentisini kullanarak bu kaydı kütüphanenize ekleyebilirsiniz. Tarayıcınızın Zotero düğmesine tıklayın.');
            }, 100);
        } else {
            alert('Zotero eklentisini kullanarak bu kaydı kütüphanenize ekleyebilirsiniz. Tarayıcınızın Zotero düğmesine tıklayın.');
        }
    }, 300);
});