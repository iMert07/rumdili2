// Eşleşen sözcükler için öneri listesini görüntüler.
function displaySuggestions(matches, query) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    const suggestionsContainer = document.getElementById('suggestions-container');

    if (matches.length === 0) {
        const noResultText = isGreek ? convertToGreek(translations.tr.no_result) : translations.tr.no_result;
        suggestionsDiv.innerHTML = `<div class="p-4 text-muted-light dark:text-muted-dark">${noResultText}</div>`;
        suggestionsContainer.classList.remove('hidden');
        return;
    }

    matches.sort((a, b) => {
        // Sıralama için ana kelimeyi (Sözcük) kullanmaya devam edelim
        const aWord = a.data.Sözcük; 
        const bWord = b.data.Sözcük;
        return normalizeString(aWord).localeCompare(normalizeString(bWord));
    }).slice(0, 12).forEach(match => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';

        let wordToDisplay = match.data.Sözcük || ''; // Madde Adı (Deve)
        let primaryMatchText = ''; // Kullanıcının arama yaptığı terim (camelus veya İsim)
        let secondaryInfo = '';     // İkincil Bilgi (Madde Adı)

        
        if (match.type === 'main') {
            // Ana Kelime Araması: Solda Ana Kelime (Deve)
            primaryMatchText = wordToDisplay;
            secondaryInfo = '';
        } else if (match.type === 'synonym') {
            // Eş Anlamlı Araması: Solda Eş Anlamlı (at/camelus), Sağda Ana Kelime (Yılkı/Deve)
            primaryMatchText = match.synonym; 
            secondaryInfo = wordToDisplay; // Ana kelime
        } else if (match.type === 'type') {
            // Tür Araması: Solda Tür (İsim/Fiil/camelus), Sağda Ana Kelime (Deve)
            // Senin isteğin doğrultusunda: solda aranan terim, sağda madde adı
            primaryMatchText = match.typeValue; // Örneğin "İsim" veya "camelus"
            secondaryInfo = wordToDisplay;     // Örneğin "Deve"
        }


        // Rum alfabesine dönüştürme
        if (isGreek) {
            primaryMatchText = convertToGreek(primaryMatchText);
            secondaryInfo = convertToGreek(secondaryInfo);
        }
        
        // Öneri görünümünü ayarla
        if (match.type === 'main') {
            // Sadece ana kelimeyi göster
            suggestion.innerHTML = `<span class="font-bold">${primaryMatchText}</span>`;
        } else {
            // Eş anlamlı veya Tür araması: Solda aranan terim, sağda Ana kelime/Madde Adı
             suggestion.innerHTML = `
                <span class="font-bold">${primaryMatchText}</span>
                <span class="text-muted-light dark:text-muted-dark ml-2 text-sm">${secondaryInfo}</span>
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
