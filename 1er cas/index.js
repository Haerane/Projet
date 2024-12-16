const axios = require('axios');
const cheerio = require('cheerio');
const natural = require('natural');
const { removeStopwords } = require('stopword');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const tfidf = new natural.TfIdf();

// URL des sites à scraper
const URLS = {
    leMonde: 'https://www.lemonde.fr/',
    RFI: 'https://www.rfi.fr/fr/podcasts/aujourd-hui-l-%C3%A9conomie/20241211-d%C3%A9ficit-croissance-inflation-les-priorit%C3%A9s-pour-le-prochain-gouvernement-fran%C3%A7ais'
};

// Chemin du fichier CSV
const CSV_FILE_PATH = 'news_combined.csv';

// Configuration de l'écriture CSV
const csvWriter = createCsvWriter({
    path: CSV_FILE_PATH,
    header: [
        { id: 'title', title: 'Titre' },
        { id: 'content', title: 'Contenu' },
        { id: 'source', title: 'Source' },
        { id: 'date', title: 'Date de Publication' }
    ],
    fieldDelimiter: ';',
    alwaysQuote: true
});

const SIMILARITY_THRESHOLD = 0.85; // Seuil de similarité pour détecter les doublons

// Fonction principale
async function scrapeSources() {
    try {
        const allNews = [];

        // Scraper les deux sites
        console.log('Scraping Le Monde...');
        const leMondeNews = await scrapeLeMonde();
        allNews.push(...leMondeNews);

        console.log('Scraping RFI...');
        const rfiNews = await scrapeRFI();
        allNews.push(...rfiNews);

        // Prétraitement des données
        console.log('Prétraitement des données...');
        const preprocessedData = allNews.map(article => ({
            ...article,
            content: preprocessText(article.content)
        }));

        // Ajouter les contenus au modèle TF-IDF
        preprocessedData.forEach(article => tfidf.addDocument(article.content));

        // Sauvegarder les données dans un fichier CSV
        await saveToCsv(preprocessedData);
        console.log(`Les données combinées ont été enregistrées dans le fichier : ${CSV_FILE_PATH}`);

        // Détection des doublons
        console.log('Détection des doublons...');
        const duplicates = detectDuplicates(preprocessedData);
        if (duplicates.length) {
            console.log('Doublons détectés :');
            duplicates.forEach(d => {
                console.log(
                    `- "${d.article1}" et "${d.article2}" ont une similarité de ${d.similarity}`
                );
            });
        } else {
            console.log('Aucun doublon détecté.');
        }
    } catch (error) {
        console.error('Erreur lors du scraping :', error.message);
    }
}

// Fonction pour scraper Le Monde
async function scrapeLeMonde() {
    const news = [];
    try {
        const { data } = await axios.get(URLS.leMonde);
        const $ = cheerio.load(data);

        $('h1.article__title').each((index, element) => {
            const title = $(element).text().trim();
            const link = $(element).closest('a').attr('href');
            if (title && link) {
                news.push({
                    title,
                    link: link.startsWith('http') ? link : `${URLS.leMonde}${link}`,
                    source: 'Le Monde'
                });
            }
        });

        for (let article of news) {
            console.log(`Extraction des détails pour : ${article.title}`);
            const details = await scrapeArticleDetails(article.link, article.source);
            Object.assign(article, details);
        }
    } catch (error) {
        console.error('Erreur lors du scraping de Le Monde :', error.message);
    }
    return news;
}

// Fonction pour scraper RFI
async function scrapeRFI() {
    const news = [];
    try {
        const { data } = await axios.get(URLS.RFI);
        const $ = cheerio.load(data);

        const title = $('h1.t-content__title').text().trim() || 'Titre non disponible';
        const contentParagraphs = $('p')
            .map((index, el) => $(el).text().trim())
            .get()
            .join(' ') || 'Contenu non disponible';
        const date = $('time[pubdate]').attr('datetime') || 'Date non disponible';
        const source = 'RFI';

        if (title && contentParagraphs && date) {
            news.push({
                title,
                content: cleanText(contentParagraphs),
                date: cleanText(date),
                source: cleanText(source)
            });
        }
    } catch (error) {
        console.error('Erreur lors du scraping de RFI :', error.message);
    }
    return news;
}

// Fonction pour extraire les détails d’un article (utilisée pour Le Monde)
async function scrapeArticleDetails(url, source) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const content = $('p.article__paragraph')
            .map((index, el) => $(el).text().trim())
            .get()
            .join(' ') || 'Contenu non disponible';
        const date = $('span.date').first().text().trim() || 'Date non disponible';

        return {
            content: cleanText(content),
            date: cleanText(date),
            source: cleanText(source)
        };
    } catch (error) {
        console.error(`Erreur lors du scraping de l'article : ${url}`, error.message);
        return {
            content: 'Erreur lors de l\'extraction du contenu',
            date: 'Date non disponible',
            source
        };
    }
}

// Fonction pour nettoyer les textes
function cleanText(text) {
    return text.replace(/\s+/g, ' ').replace(/;/g, ' ').trim();
}

// Fonction pour prétraiter le texte
function preprocessText(text) {
    let processedText = text.toLowerCase();
    processedText = processedText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    processedText = processedText.replace(/<\/?[^>]+(>|$)/g, '').replace(/[^a-z\s]/g, '');
    processedText = removeStopwords(processedText.split(' ')).join(' ');
    return processedText.trim();
}

// Fonction pour sauvegarder les données dans un fichier CSV
async function saveToCsv(data) {
    try {
        await csvWriter.writeRecords(data);
    } catch (error) {
        console.error('Erreur lors de la sauvegarde dans le fichier CSV :', error.message);
    }
}

// Fonction pour calculer la similarité Cosine
function calculateCosineSimilarity(text1, text2) {
    const vectorizer = new natural.TfIdf();

    vectorizer.addDocument(text1);
    vectorizer.addDocument(text2);

    const vec1 = [];
    const vec2 = [];

    vectorizer.tfidfs('', (i, measure) => {
        vec1.push(vectorizer.documents[0][i] || 0);
        vec2.push(vectorizer.documents[1][i] || 0);
    });

    const dotProduct = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, v) => sum + v ** 2, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, v) => sum + v ** 2, 0));

    return dotProduct / (magnitude1 * magnitude2);
}

// Fonction pour détecter les doublons
function detectDuplicates(articles) {
    const duplicates = [];
    const len = articles.length;

    for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
            const article1 = articles[i];
            const article2 = articles[j];

            const similarity = calculateCosineSimilarity(article1.content, article2.content);

            if (similarity >= SIMILARITY_THRESHOLD) {
                duplicates.push({
                    article1: article1.title,
                    article2: article2.title,
                    similarity: similarity.toFixed(2)
                });
            }
        }
    }

    return duplicates;
}

// Lancer le programme
scrapeSources();
