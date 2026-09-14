# Application de Gestion de Budget

Bienvenue dans ce projet de gestion de budget ! Vous êtes actuellement sur la seconde version de mon application.

Ce projet a été pensé et créé de zéro. Il m'a permis d'effectuer une mise à jour complète de mes connaissances sur Angular (notamment sur la version 19), mais surtout de monter en compétence en Java et Spring Boot 3.

---

## Architecture Technique

### Front-End (Angular 19)

Côté front, j'ai choisi d'utiliser les "Signals" pour une détection des changements rapide et un code allégé.
L'initialisation est faite dans le fichier `app.ts` avec un `forkJoin` asynchrone pour que toutes les configurations soient chargées dans le bon ordre.

### Back-End (Spring Boot 3 & JPA)

Côté backend, j'ai implémenté une requête de récupération des transactions filtrées la plus optimisée possible en utilisant un `FetchJoin` (pour éviter de faire des requêtes inutiles à la base de données).

### Tests unitaires

Que ce soit côté back ou côté front, des tests unitaires complets ont été implémentés pour garantir le bon fonctionnement de chaque composant et de chaque service.

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

**Prérequis :** Java 21 et Node.js (v22+) installés.

#### 1. La Base de données (PostgreSQL)

Si vous ne possédez pas de base locale, vous pouvez lancer uniquement le conteneur de données Docker :

```bash
docker compose up postgres-db
```

_(Identifiants par défaut configurés dans le projet : `postgres` / `admin`, Base : `gestionCompte`)_

#### 2. Lancement du Back-End (via le JAR de secours fourni)

Une version pré-compilée et autonome du Back-end est disponible dans le dossier `release`.

```bash
java -jar release/apirest-0.0.1-SNAPSHOT.jar
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
