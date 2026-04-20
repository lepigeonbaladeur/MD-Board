<h1 align="center"> MD-Board</h1>

<h4 align="center">Transformez n'importe quelle "Awesome List" Markdown en un tableau de bord moderne et interactif.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/VibeCoding-FFA500?style=flat&logo=music&logoColor=black" alt="VibeCoding">
</p>

<p align="center">
  <kbd>
    <img src="https://github.com/lepigeonbaladeur/MD-Board/blob/main/screenshot.png?raw=true" alt="MD-Board Screenshot" width="850">
  </kbd>
</p>

> [!WARNING]
> **PUR VIBECODING INSIDE** ⚠️  
> Ce projet résulte d'un *vibecoding* : codé à l'instinct, itéré rapidement, sans framework lourd ni architecture complexe sur six mois. Brut et fonctionnel, il va droit au but dans une architecture minimaliste. Pas de tests unitaires ni de structure MVC stricte, mais un outil qui fonctionne direct dans le navigateur. Bienvenue !

## 🔎 Aperçu du Projet

**MD-Board** est une *Single Page Application* (SPA) 100% Vanilla.

Son objectif principal est de transformer un fichier texte brut — en particulier les fameuses "Awesome Lists" de GitHub au format Markdown — en une interface graphique esthétique, triable et permettant d'assurer un suivi. L'application tourne entièrement dans votre navigateur et repose sur trois fichiers : `index.html`, `style.css` et `app.js`, sans aucune dépendance JavaScript externe. Elle nécessite une connexion internet pour récupérer les listes Markdown depuis GitHub et charger les polices (Google Fonts).

## ✨ Fonctionnalités

* **Zéro Dépendance JS** : Pas de React, pas de Vue, pas d'outils de build. Juste du HTML, du CSS et du JavaScript pur.
* **Analyse Intelligente** : Lit automatiquement les fichiers Markdown (via des URL brutes) et extrait les outils, les liens, les catégories et les descriptions.
* **Suivi de Progression** : Marquez les éléments comme "vus", donnez-leur une note sur 5 étoiles et filtrez vos listes instantanément.
* **Collections Personnalisées** : Regroupez vos outils préférés dans des collections sur-mesure avec un code couleur.
* **Sauvegarde Automatique** : Votre progression, vos dépôts et vos collections sont sauvegardés automatiquement dans le `localStorage` de votre navigateur — rien n'est perdu entre deux sessions.
* **Thème Clair / Sombre** : S'adapte automatiquement aux préférences de votre système ou basculable manuellement (sauvegardé en local).
* **Import & Export JSON** : Exportez l'intégralité de votre progression dans un fichier JSON pour la sauvegarder ou la transférer. L'import restaure tout en écrasant l'état courant (validation stricte du type MIME incluse).
* **Ultra Rapide & Optimisé** : Utilise un système léger de cache des nœuds ("DOM diffing") pour un rendu ultra-rapide sans ralentir le navigateur, même sur de grosses listes.

## 🚀 Installation & Utilisation

Puisque **MD-Board** ne nécessite aucun outil de build, il n'y a **pas de `npm install`**.

### 1. Récupérer les fichiers
* **Via Git** (Recommandé) :
```bash
    git clone https://github.com/lepigeonbaladeur/MD-Board.git
```
* **Téléchargement direct** : Téléchargez le dépôt sous forme d'archive `.zip` et extrayez-la sur votre ordinateur.

### 2. Lancer l'application

> [!IMPORTANT]
> Ouvrir `index.html` directement avec le protocole `file://` peut bloquer les requêtes réseau sur certains navigateurs (restrictions CORS). Il est recommandé de servir les fichiers via un petit serveur local :
> ```bash
> # avec Node.js
> npx serve .
> # ou avec Python
> python -m http.server
> ```
> L'extension **Live Server** de VS Code fonctionne également.

### 3. Charger une liste
1. Au démarrage, l'écran d'accueil vous invite à ajouter votre premier dépôt.
2. Cliquez sur **"+ Ajouter un dépôt"**.
3. Collez l'URL d'un README GitHub (ex: `https://github.com/sindresorhus/awesome/blob/main/readme.md`). MD-Board se chargera de la convertir en URL brute automatiquement.
4. L'application charge, parse et affiche le catalogue instantanément.

---

> [!NOTE]
> **Garantie** : Ce projet est fourni "tel quel", sans garantie d'aucune sorte.  
> **Responsabilité** : L'auteur décline toute responsabilité en cas de bug ou de perte de données. L'utilisateur assume l'entière responsabilité de son utilisation et de ses modifications.

### 📜 Licence
Ce projet est distribué sous la **licence MIT**. Vous êtes libre de :
* **L'utiliser** pour vos besoins.
* **Le modifier** et l'adapter.
* **Le partager** et le redistribuer selon les conditions de la licence choisie.
