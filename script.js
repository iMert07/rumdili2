// Dizeleri standart bir formata dönüştürür (küçük harfe çevirme gibi).
// Bu, arama ve eşleştirme işlemlerinin daha tutarlı olmasını sağlar.
function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase();
}

// Uygulamanın genel durumunu tutan değişkenler.
let allWords = [];
let lastSelectedWord = null;
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
let isGreek = false; // Alfabenin başlangıç durumu (Latin)

// Harf dönüşüm eşleşmelerini burada tanımlayalım.
const latinToGreekMap = {
    "a":"Α","A":"Α",
    "e":"Ε","E":"Ε",
    "i":"Ͱ","İ":"Ͱ",
    "n":"Ν","N":"Ν",
    "r":"Ρ","R":"Ρ",
    "l":"L","L":"L",
    "ı":"Ь","I":"Ь",
    "k":"Κ","K":"Κ",
    "d":"D","D":"D",
    "m":"Μ","M":"Μ",
    "t":"Τ","T":"Τ",
    "y":"J","Y":"J",
    "s":"Σ","S":"Σ",
    "u":"Υ","U":"Υ",
    "o":"Ϙ","O":"Ϙ",
    "b":"Β","B":"Β",
    "ş":"Ш","Ş":"Ш",
    "ü":"U","Ü":"U",
    "z":"Ζ","Z":"Ζ",
    "g":"Γ","G":"Γ",
    "ç":"C","Ç":"C",
    "ğ":"R","Ğ":"R",
    "v":"F","V":"F",
    "c":"G","C":"G",
    "h":"Η","H":"Η",
    "p":"Π","P":"Π",
    "ö":"Ω","Ö":"Ω",
    "f":"V","F":"V",
    "x":"Ψ","X":"Ψ",
    "j":"Ϸ","J":"Ϸ"
};


// Google Sheets'ten verileri çeker.
async function fetchWords() {
    const sheetId = '1R01aIajx6dzHlO-KBiUXUmld2AEvxjCQkUTFGYB3EDM';
    const sheetName = 'Sözlük';
    const url = `https://opensheet.elk.sh/${sheetId}/${sheetName}`;

    try {
        const response = await fetch(url);
        allWords = await response.json();
        setupSearch();
        setupAlphabetToggle(); // Yeni eklenen alfabe tuşunu kurar
        showPage('home'); // Sayfa yüklendiğinde ana sayfayı gösterir.
    } catch (error) {
        console.error('VERİ ÇEKME HATASI:', error);
        document.getElementById('result').innerHTML =
            '<p style="color: red;">VERİLER YÜKLENİRKEN HATA OLUŞTU. LÜTFEN SAYFAYI YENİLEYİN.</p>';
    }
}

// Hangi sayfanın (ana sayfa veya hakkında) görüntüleneceğini kontrol eder.
function showPage(pageId) {
    const homeContent = document.getElementById('home-content');
    const aboutContent = document.getElementById('about-content');
    const searchInput = document.getElementById('searchInput');

    homeContent.classList.add('hidden');
    aboutContent.classList.add('hidden');
    searchInput.disabled = true;

    if (pageId === 'home') {
        homeContent.classList.remove('hidden');
        searchInput.disabled = false;
        clearResult();
    } else if (pageId === 'about') {
        aboutContent.classList.remove('hidden');
    }
}


// Arama kutusu ve önerilerle ilgili olay dinleyicilerini kurar.
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const resultDiv = document.getElementById('result');

    // Sayfa yüklendiğinde geçmiş aramaları gösterir.
    displaySearchHistory();

    // Kullanıcı arama kutusuna yazı yazdığında çalışır.
    searchInput.addEventListener('input', function () {
        const rawQuery = this.value.trim();
        const query = normalizeString(rawQuery);

        if (!query) {
            suggestionsDiv.innerHTML = '';
            resultDiv.innerHTML = '';
            displaySearchHistory();
            return;
        }

        const matches = [];
        allWords.forEach(row => {
            const mainWord = row.Sözcük || '';
            const mainNorm = normalizeString(mainWord);
            const synonyms = row['Eş Anlamlılar']
                ? row['Eş Anlamlılar'].split(',').map(s => s.trim())
                : [];

            if (mainNorm.startsWith(query)) {
                matches.push({ type: 'main', word: mainWord, data: row });
            } else {
                synonyms.forEach(syn => {
                    if (normalizeString(syn).startsWith(query)) {
                        matches.push({ type: 'synonym', synonym: syn, main: mainWord, data: row });
                    }
                });
            }
        });

        displaySuggestions(matches, query);
    });

    // Arama kutusuna odaklanıldığında geçmişi gösterir.
    searchInput.addEventListener('focus', () => {
        if (!searchInput.value.trim()) displaySearchHistory();
    });

    // Enter tuşuna basıldığında ilk öneriyi seçer.
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstSuggestion = suggestionsDiv.querySelector('.suggestion');
            if (firstSuggestion) firstSuggestion.click();
        }
    });

    // Eğer daha önce bir kelime seçilmişse, sonucu gösterir.
    if (lastSelectedWord) {
        showResult(lastSelectedWord);
    }
}

// Alfabe değiştirme tuşu için olay dinleyicilerini kurar.
function setupAlphabetToggle() {
    const toggleButton = document.getElementById('alphabet-toggle');
    toggleButton.addEventListener('click', toggleAlphabet);
}

// Harfleri değiştirme fonksiyonu
function toggleAlphabet() {
    isGreek = !isGreek;
    
    // Simgeyi değiştirir
    document.getElementById('alphabet-toggle-latin').classList.toggle('hidden', isGreek);
    document.getElementById('alphabet-toggle-cyrillic').classList.toggle('hidden', !isGreek);

    // Sonuç sayfasındaki metni günceller
    if (lastSelectedWord) {
        showResult(lastSelectedWord);
    }
}

// Eşleşen sözcükler için öneri listesini görüntüler.
function displaySuggestions(matches, query) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    const suggestionsContainer = document.getElementById('suggestions-container');

    if (matches.length === 0) {
        suggestionsDiv.innerHTML = `<div class="p-4 text-muted-light dark:text-muted-dark">Sonuç bulunamadı</div>`;
        suggestionsContainer.classList.remove('hidden');
        return;
    }

    matches.sort((a, b) => {
        const aWord = a.type === 'main' ? a.word : a.synonym;
        const bWord = b.type === 'main' ? b.word : b.synonym;
        return normalizeString(aWord).localeCompare(normalizeString(bWord));
    }).slice(0, 12).forEach(match => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';

        let wordToDisplay = match.type === 'main' ? match.word : match.synonym;
        let mainWordToDisplay = match.type === 'synonym' ? match.main : '';

        if (isGreek) {
            wordToDisplay = convertToGreek(wordToDisplay);
            mainWordToDisplay = convertToGreek(mainWordToDisplay);
        }

        if (match.type === 'main') {
            suggestion.innerHTML = `<span class="font-bold">${wordToDisplay}</span>`;
        } else {
            suggestion.innerHTML = `
                <span class="font-bold">${wordToDisplay}</span>
                <span class="text-muted-light dark:text-muted-dark ml-2 text-sm">${mainWordToDisplay}</span>
            `;
        }

        suggestion.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectWord(match.data);
            document.getElementById('searchInput').focus(); // Arama kutusunun odaklanmasını korur
        });
        suggestionsDiv.appendChild(suggestion);
    });

    suggestionsContainer.classList.remove('hidden');
}

// Bir sözcük seçildiğinde sonuçları gösterir ve geçmişi günceller.
function selectWord(word) {
    lastSelectedWord = word;
    document.getElementById('searchInput').value = word.Sözcük;
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    showResult(word);
    updateSearchHistory(word.Sözcük);
}

// Seçilen sözcüğün detaylarını ekranda görüntüler.
function showResult(word) {
    const resultDiv = document.getElementById('result');
    
    let wordToDisplay = word.Sözcük;
    let synonymsToDisplay = word['Eş Anlamlılar'] || 'Bulunmamaktadır.';
    let descriptionToDisplay = word.Açıklama || 'Açıklama bulunmamaktadır.';
    let originToDisplay = word.Öz || 'Köken bilgisi bulunmamaktadır.';

    if (isGreek) {
      wordToDisplay = convertToGreek(wordToDisplay);
      synonymsToDisplay = convertToGreek(synonymsToDisplay);
      descriptionToDisplay = convertToGreek(descriptionToDisplay);
      originToDisplay = convertToGreek(originToDisplay);
    }

    resultDiv.innerHTML = `
        <div class="bg-subtle-light dark:bg-subtle-dark rounded-lg sm:rounded-xl overflow-hidden p-4 sm:p-6">
            <h2 class="text-2xl font-bold mb-4">${wordToDisplay}</h2>
            <div class="mb-4">
                <span class="font-semibold text-lg">Eş Anlamlılar:</span>
                <span class="text-muted-light dark:text-muted-dark">${synonymsToDisplay}</span>
            </div>
            <div class="mb-4">
                <span class="font-semibold text-lg">Açıklama:</span>
                <p class="text-base">${descriptionToDisplay}</p>
            </div>
            <div>
                <span class="font-semibold text-lg">Köken:</span>
                <p class="text-base">${originToDisplay}</p>
            </div>
        </div>
    `;
}

// Arama kutusunu ve sonuçları temizler.
function clearResult() {
    document.getElementById('result').innerHTML = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    displaySearchHistory();
}

// Arama geçmişini localStorage'da günceller.
function updateSearchHistory(query) {
    const historyIndex = searchHistory.indexOf(query);
    if (historyIndex > -1) {
        searchHistory.splice(historyIndex, 1);
    }
    searchHistory.unshift(query);

    if (searchHistory.length > 12) {
        searchHistory.pop();
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

// Arama geçmişini öneri listesi olarak görüntüler.
function displaySearchHistory() {
    const suggestionsDiv = document.getElementById('suggestions');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const searchInput = document.getElementById('searchInput');

    if (searchInput === document.activeElement && !searchInput.value.trim() && searchHistory.length > 0) {
        suggestionsDiv.innerHTML = '';
        searchHistory.slice(0, 12).forEach(history => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';
            
            let historyToDisplay = isGreek ? convertToGreek(history) : history;

            suggestion.innerHTML = `<span class="font-bold">${historyToDisplay}</span>`;

            suggestion.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const selectedWord = allWords.find(row => row.Sözcük === history);
                if (selectedWord) selectWord(selectedWord);
            });
            suggestionsDiv.appendChild(suggestion);
        });
        suggestionsContainer.classList.remove('hidden');
    }
}

// Geri bildirim modalını gösterir veya gizler.
function toggleFeedbackForm() {
    const feedbackModal = document.getElementById('feedbackModal');
    feedbackModal.classList.toggle('hidden');
}

// Geri bildirim verilerini SheetDB'ye gönderir.
function submitFeedback() {
    const feedbackText = document.getElementById('feedbackText').value.trim();
    if (!feedbackText) {
        alert('Lütfen geri bildirim yazın.');
        return;
    }

    const tarih = new Date().toLocaleString('tr-TR');

    fetch('https://sheetdb.io/api/v1/mt09gl0tun8di', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { "Tarih": tarih, "Mesaj": feedbackText } })
    })
        .then(response => response.json())
        .then(() => {
            alert('Geri bildiriminiz alındı, teşekkür ederiz!');
            toggleFeedbackForm();
        })
        .catch(error => {
            console.error('Geri bildirim gönderilirken hata oluştu:', error);
            alert('Bir hata oluştu, lütfen tekrar deneyin.');
        });
}

// Mobil menüyü gösterir veya gizler.
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
}

// Metni Rum alfabesine dönüştürme fonksiyonu
function convertToGreek(text) {
    if (!text) return '';
    let convertedText = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        let found = false;
        // İki harfli eşleşmeleri kontrol et
        if (i + 1 < text.length) {
            const twoChar = char + text[i + 1];
            if (latinToGreekMap[twoChar]) {
                convertedText += latinToGreekMap[twoChar];
                i++; // İki karakter ilerle
                found = true;
            }
        }
        // Eğer iki harfli eşleşme bulunamazsa tek harf eşleşmeyi kontrol et
        if (!found) {
            if (latinToGreekMap[char]) {
                convertedText += latinToGreekMap[char];
            } else {
                convertedText += char;
            }
        }
    }
    return convertedText;
}

fetchWords();
