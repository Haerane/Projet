const axios = require('axios');
const cheerio = require('cheerio');
const { removeStopwords } = require('stopword');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const use = require('@tensorflow-models/universal-sentence-encoder');
const tf = require('@tensorflow/tfjs');

// URL des sites à scraper
const URLS = {
    jeuneAfrique: 'https://www.jeuneafrique.com/1641206/societe/cop16-a-ryad-pas-daccord-mondial-pour-lutter-contre-la-secheresse/',
    RFI: 'https://www.rfi.fr/fr/environnement/20241214-la-cop16-sur-la-d%C3%A9sertification-s-ach%C3%A8ve-sans-trouver-d-accord-sur-la-question-centrale-de-la-s%C3%A9cheresse'

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
        console.log('Scraping Jeune Afrique...');
        const jeuneAfriqueNews = await scrapeJeuneAfrique();
        allNews.push(...jeuneAfriqueNews);

        console.log('Scraping RFI...');
        const rfiNews = await scrapeRFI();
        allNews.push(...rfiNews);

        // Prétraitement des données
        console.log('Prétraitement des données...');
        const preprocessedData = allNews.map(article => ({
            ...article,
            content: preprocessText(article.content)
        }));

        // Sauvegarder les données dans un fichier CSV
        await saveToCsv(preprocessedData);
        console.log(`Les données combinées ont été enregistrées dans le fichier : ${CSV_FILE_PATH}`);

        // Détection des doublons
        console.log('Détection des doublons...');
        const duplicates = await detectDuplicates(preprocessedData);
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

// Fonction pour scraper Jeune Afrique
async function scrapeJeuneAfrique() {
    const news = [];
    try {
        const { data } = await axios.get(URLS.jeuneAfrique);
        const $ = cheerio.load(data);

        const title = $('h1.headline__title').text().trim();
        const contentParagraphs = $('p').map((index, el) => $(el).text().trim()).get().join(' ');
        const date = $('span.relative').first().text().trim();
        const source = 'Jeune Afrique';

        if (title && contentParagraphs && date) {
            news.push({
                title,
                content: cleanText(contentParagraphs),
                date: cleanText(date),
                source: cleanText(source)
            });
        }
    } catch (error) {
        console.error('Erreur lors du scraping de Jeune Afrique :', error.message);
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

// Fonction pour détecter les doublons
async function detectDuplicates(articles) {
    const duplicates = [];
    const len = articles.length;

    try {
        const model = await use.load();

        // Générer les embeddings pour tous les articles
        const embeddings = await Promise.all(
            articles.map(article => model.embed(article.content))
        );

        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const similarity = calculateCosineSimilarity(embeddings[i], embeddings[j]);

                if (similarity >= SIMILARITY_THRESHOLD) {
                    duplicates.push({
                        article1: articles[i].title,
                        article2: articles[j].title,
                        similarity: similarity.toFixed(2)
                    });
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du calcul des similarités :', error.message);
    }

    return duplicates;
}

// Fonction pour calculer la similarité Cosine entre deux embeddings
function calculateCosineSimilarity(vector1, vector2) {
    const dotProduct = tf.tidy(() => tf.sum(tf.mul(vector1, vector2)).dataSync()[0]);
    const magnitude1 = tf.tidy(() => tf.sqrt(tf.sum(tf.square(vector1))).dataSync()[0]);
    const magnitude2 = tf.tidy(() => tf.sqrt(tf.sum(tf.square(vector2))).dataSync()[0]);

    return dotProduct / (magnitude1 * magnitude2);
}

// Lancer le programme
scrapeSources();
