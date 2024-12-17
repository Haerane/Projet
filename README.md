

## Description
Ce projet est conçu pour **détecter les doublons** dans les actualités en ligne en utilisant des algorithmes d'analyse textuelle et d'intelligence artificielle.

## Fonctionnalités
- Analyse des textes pour détecter les similitudes.
- Comparaison des actualités provenant de différentes sources.
- Exportation des résultats dans un fichier CSV.

## Technologies utilisées
- Langage : Node.js 
- Outils : Visual Studio Code, GitHub
- Bibliothèques : axios ; cheerio et @tensorflow-models/universal-sentence-encoder.
 

## Auteur
https://github.com/Haerane
Rapport Technique : Détection de Doublons dans les Actualités Web
Introduction
Ce rapport explique les étapes réalisées, les résultats obtenus, et les pistes d'amélioration pour un programme qui détecte les doublons dans les actualités extraites de plusieurs sites web. Le script a été développé en utilisant Node.js avec des bibliothèques comme axios, cheerio et @tensorflow-models/universal-sentence-encoder.
Étapes Réalisées
1. Extraction des Données
Les données ont été récupérées depuis deux sites principaux :
•	Jeune Afrique : Le titre, le contenu principal (extrait des balises <p>) et la date de publication sont ciblés.
•	RFI : De manière similaire, le titre, le contenu et la date de publication sont extraits.
Le programme utilise axios pour faire des requêtes HTTP et cheerio pour analyser le HTML et récupérer les informations nécessaires. Une fois extraits, les textes sont nettoyés pour supprimer les espaces inutiles et les caractères spéciaux.
2. Prétraitement des Données
Avant l'analyse, les textes subissent un prétraitement :
•	Passage en minuscules.
•	Suppression des accents et caractères inutiles.
•	Élimination des mots courants sans signification (stopwords) grâce à la bibliothèque stopword.
•	Uniformisation des espaces.
3. Sauvegarde des Données
Les articles traités sont enregistrés dans un fichier CSV grâce à csv-writer. Les colonnes du fichier incluent :
•	Titre
•	Contenu
•	Source
•	Date de Publication
4. Détection des Doublons
Pour détecter les doublons, on calcule la similarité cosine entre les contenus des articles en utilisant le modèle Universal Sentence Encoder (USE) :
•	Les contenus des articles sont transformés en vecteurs numériques (embeddings).
•	On compare les paires d’articles, et ceux avec une similarité égale ou supérieure à 0,85 sont considérés comme des doublons.
Résultats Obtenus
Taux de Détection des Doublons
•	Nombre d’articles analysés : 2
•	Nombre de paires comparées : 1
•	Doublons détectés : 0 (valeur donnée à titre d’exemple, à ajuster selon les résultats réels).
Le seuil de 0,85 utilisé pour la similarité peut être ajusté pour s'adapter aux variations dans les contenus.
Cas Complexes Rencontrés
Le programme peut rencontrer des limites dans les cas suivants :
•	Articles sur le même sujet mais écrits différemment.
•	Articles très courts ou avec peu de contenu informatif.
Améliorations Possibles
1. Améliorer la Précision
•	Ajouter plus de données : Enrichir les comparaisons avec des métadonnées comme les auteurs ou les mots-clés.
•	Traiter les synonymes : Utiliser un outil qui identifie les synonymes ou simplifie les formulations.
2. Optimiser les Performances
•	Réduire le nombre de comparaisons inutiles en regroupant les articles par sujet ou par source avant d’appliquer le modèle.
•	Calculer et stocker à l’avance les embeddings pour les articles fréquemment utilisés.
3. Gérer Mieux les Erreurs
•	Mettre en place des alertes pour signaler les problèmes d’accès aux URLs ou des changements dans la structure des pages web.
•	Ajouter un système de suivi des erreurs rencontrées pendant le traitement.
4. Tester sur Plus de Données
•	Évaluer le programme sur un volume plus important et varié d’articles.
•	Tester différents seuils de similarité pour affiner la détection.
Conclusion
Ce programme est une première version fonctionnelle pour extraire et analyser les actualités afin de détecter les doublons. Avec les améliorations proposées, il sera possible d’accroître son efficacité et sa robustesse. Des tests réguliers et des ajustements sont essentiels pour s’assurer qu’il reste performant face aux changements dans les sources et les données.


