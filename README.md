<h1 align="center"> MD-Board</h1>

<h4 align="center">Transformez n'importe quelle "Awesome List" Markdown en un tableau de bord moderne et interactif.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Dependencies-0-brightgreen?style=flat" alt="Dependencies">
  <img src="https://img.shields.io/badge/VibeCoding-FFA500?style=flat&logo=music&logoColor=black" alt="VibeCoding">
</p>

<p align="center">
  <kbd>
    <img src="https://github.com/lepigeonbaladeur/MD-Board/blob/main/screenshot.png?raw=true" alt="MD-Board Screenshot" width="850">
  </kbd>
</p>

> [!WARNING]
> **PUR VIBECODING INSIDE** ⚠️  
> Ce projet résulte d’un *vibecoding* : codé à l’instinct, itéré rapidement, sans framework lourd ni architecture complexe sur six mois. Brut et fonctionnel, il va droit au but dans une architecture minimaliste. Pas de tests unitaires ni de structure MVC stricte, mais un outil qui fonctionne direct dans le navigateur. Bienvenue !

## 🔎 Aperçu du Projet

**MD-Board** est une *Single Page Application* (SPA) 100% Vanilla. 

Son objectif principal est de transformer un fichier texte brut — en particulier les fameuses "Awesome Lists" de GitHub au format Markdown — en une interface graphique esthétique, triable et permettant d'assurer un suivi. L'application tourne entièrement en local dans votre navigateur, avec zéro dépendance externe et repose sur trois fichiers simples : `index.html`, `style.css` et `app.js`.

## ✨ Fonctionnalités

* **Zéro Dépendance** : Pas de React, pas de Vue, pas d'outils de build. Juste du HTML, du CSS et du JavaScript pur.
* **Analyse Intelligente** : Lit automatiquement les fichiers Markdown (via des URL brutes) et extrait les outils, les liens, les catégories et les descriptions.
* **Suivi de Progression** : Marquez les éléments comme "vus", donnez-leur une note sur 5 étoiles et filtrez vos listes instantanément.
* **Collections Personnalisées** : Regroupez vos outils préférés dans des collections sur-mesure avec un code couleur.
* **Thème Clair / Sombre** : S'adapte automatiquement aux préférences de votre système ou basculable manuellement (sauvegardé en local).
* **Import & Export Sécurisés** : Sauvegardez votre progression, vos collections et les dépôts chargés localement via un fichier JSON (avec validation stricte du type MIME pour éviter les corruptions).
* **Ultra Rapide & Optimisé** : Utilise un système léger de cache des nœuds ("DOM diffing") pour un rendu ultra-rapide sans ralentir le navigateur, même sur de grosses listes.

## 🚀 Installation & Utilisation

Puisque **MD-Board** est 100% autonome, il n'y a **aucune installation**, aucun `npm install` et aucun serveur requis.

### 1. Récupérer l'outil
* **Via Git** (Recommandé) :
    ```bash
    git clone https://github.com/lepigeonbaladeur/MD-Board.git
    ```
* **Téléchargement direct** : Téléchargez le dépôt sous forme d'archive `.zip` et extrayez-le sur votre ordinateur.

### 2. Lancer l'application
* **Ouvrez** simplement le fichier `index.html` avec votre navigateur (Chrome, Firefox, Safari, Edge).

### 3. Charger une liste
1.  Au démarrage, l'écran d'accueil vous invite à ajouter votre premier dépôt.
2.  Cliquez sur **"+ Ajouter un dépôt"**.
3.  Collez l'URL d'un README GitHub (ex: `https://github.com/sindresorhus/awesome/blob/main/readme.md`). MD-Board se chargera de la convertir en URL brute automatiquement.
4.  L'application charge, parse et affiche le catalogue instantanément.

---

> [!IMPORTANT]
> **Garantie** : Ce projet est fourni "tel quel", sans garantie d'aucune sorte.  
> **Responsabilité** : L'auteur décline toute responsabilité en cas de bug ou de perte de données. L'utilisateur assume l'entière responsabilité de son utilisation et de ses modifications. Distribué sous une licence libre.

### 📜 Licence
Ce projet est distribué sous la **licence MIT**. Vous êtes libre de :
* **L'utiliser** pour vos besoins.
* **Le modifier** et l'adapter.
* **Le partager** et le redistribuer selon les conditions de la licence choisie.
