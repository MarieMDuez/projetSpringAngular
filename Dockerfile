# Étape 1 : Build du Front-End Angular
FROM node:22-alpine AS front-build
WORKDIR /app/front
# On va chercher les fichiers dans le sous-dossier du front
COPY gestion-budget-front/package*.json ./
RUN npm ci
COPY gestion-budget-front/ .
RUN npm run build -- --configuration=production

# Étape 2 : Build du Back-End Java avec les fichiers statiques intégrés
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY apirest/pom.xml .
COPY apirest/src ./src

# Utilisation d'un joker (*) pour parer à toute variation du nom de dossier dist/
COPY --from=front-build /app/front/dist/*/browser ./src/main/resources/static/

RUN mvn clean package -DskipTests

# Étape 3 : Exécution du JAR autonome
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 9000
ENTRYPOINT ["java", "-jar", "app.jar"]
