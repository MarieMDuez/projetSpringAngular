# Application de Gestion de Budget

Bienvenue dans ce projet de gestion de budget. Vous êtes actuellement sur la version 1, la plus basique.
Ce projet a été pensé et créé de 0 pour effectuer une mise à jour de mes connaissance en Angular et une montée en compétence sur Angular 19 notamment, mais surtout pour effectuer une montée en compétence en JAVA / Spring boot.

---

## Architecture Technique

### Front-End (Angular 19)

Coté front j'ai choisi d'utiliser les "Signals" pour une détection des changements rapides et un code allégé.
L'initialisation est faite dans le app.ts avec un "forkJoin" asynchrone pour que toutes les configurations soient chargées dans l'ordre.

### Back-End (Spring Boot 3 & JPA)

Côté backend j'ai implémenté une requête de récupération des transactions filtrées la plus optimisée possible en utilisant un FetchJoin (pour éviter de faire des requêtes inutiles)

### Tests unitaires

Que se soit côté back ou front, des tests unitaires ont été implémentés pour garantir le bon fonctionnement de chaque composant

---

## Guide de Lancement Rapide

Pour tester l'application, je vous ai mis deux méthodes à disposition selon votre environnement.

### Méthode 1 : Lancement complet via Docker (Recommandé)

Cette méthode monte automatiquement l'environnement de production packagé (Application Angular intégrée au JAR Spring Boot et conteneur PostgreSQL).

**Prérequis :** Docker Desktop lancé.

1. Ouvrez un terminal à la racine du projet.
2. Lancez la commande suivante :
   ```bash
   docker compose up --build
   ```
3. Accédez à l'application sur : **`http://localhost:9000`**

---

### Méthode 2 : Lancement Local (Sans Docker)

Idéal pour inspecter le code en direct dans votre IDE ou si Docker n'est pas disponible.

**Prérequis :** Java 21 et Node.js (v22+) installés.

#### 1. La Base de données (PostgreSQL)

Si vous ne possédez pas de base locale, vous pouvez lancer uniquement le conteneur de données Docker :

```bash
docker compose up postgres-db
```

_(Identifiants par défaut configurés dans le projet : `postgres` / `admin`, Base : `gestionCompte`)_

#### 2. Lancement du Back-End (via le JAR de secours fourni)

Une version pré-compilée et autonome du Back-end est disponible dans le dossier `exécutable`.

```bash
java -jar exécutable/backend-app.jar
```

Le serveur démarrera sur le port `9000`.

#### 3. Lancement du Front-End (Angular)

Ouvrez un nouveau terminal dans le dossier du Front-end :

```bash
cd gestion-budget-front
npm ci
npm start
```

Le Front-end se lancera en mode développement sur **`http://localhost:4200`** et pointera automatiquement vers l'API locale.
